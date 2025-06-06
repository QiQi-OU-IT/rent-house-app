#!/bin/bash

# Set up error handling and enable debug mode
set -e
set -x  # In ra các lệnh để debug
echo "Starting server deployment at $(date)" > /home/ec2-user/rent-house-app/deploy.log

# Create log directory if it doesn't exist
mkdir -p /home/ec2-user/rent-house-app/logs
LOG_FILE="/home/ec2-user/rent-house-app/logs/gunicorn.log"
touch "$LOG_FILE"  # Đảm bảo file log tồn tại
chmod 664 "$LOG_FILE"  # Đặt quyền ghi cho ec2-user
echo "Log file configured at $LOG_FILE" >> /home/ec2-user/rent-house-app/deploy.log

# Change to the application directory
cd /home/ec2-user/rent-house-app/rent_house_server || {
    echo "Failed to change to application directory" >> /home/ec2-user/rent-house-app/deploy.log
    exit 1
}
echo "Changed to directory: $(pwd)" >> /home/ec2-user/rent-house-app/deploy.log

# Activate virtual environment
if [ ! -d "venv" ]; then
    echo "Virtual environment not found! Creating new one..." >> /home/ec2-user/rent-house-app/deploy.log
    python3 -m venv venv || /usr/bin/python3 -m venv venv
fi
source venv/bin/activate || {
    echo "Failed to activate virtual environment" >> /home/ec2-user/rent-house-app/deploy.log
    exit 1
}
echo "Virtual environment activated: $(which python)" >> /home/ec2-user/rent-house-app/deploy.log

# Install dependencies and Gunicorn
pip install -r requirements.txt
if ! command -v gunicorn &> /dev/null; then
    echo "Gunicorn not found. Installing..." >> /home/ec2-user/rent-house-app/deploy.log
    pip install gunicorn
fi
echo "Gunicorn version: $(gunicorn --version)" >> /home/ec2-user/rent-house-app/deploy.log

# Check if port is already in use
if netstat -tulpn 2>/dev/null | grep -q ":8000 "; then
    echo "Port 8000 is already in use. Attempting to free it..." >> /home/ec2-user/rent-house-app/deploy.log
    PID=$(netstat -tulpn 2>/dev/null | grep ":8000 " | awk '{print $7}' | cut -d'/' -f1)
    if [ ! -z "$PID" ]; then
        echo "Killing process $PID using port 8000" >> /home/ec2-user/rent-house-app/deploy.log
        sudo kill -9 $PID 2>> /home/ec2-user/rent-house-app/deploy.log || echo "Failed to kill process $PID" >> /home/ec2-user/rent-house-app/deploy.log
    fi
else
    echo "Port 8000 is free." >> /home/ec2-user/rent-house-app/deploy.log
fi

# Stop any running Gunicorn processes
echo "Stopping any running Gunicorn processes..." >> "$LOG_FILE"
pkill -u ec2-user -f gunicorn 2>> "$LOG_FILE" || echo "No Gunicorn processes found to kill." >> "$LOG_FILE"

# Verify WSGI path exists
if [ ! -f "rent_house_server/wsgi.py" ]; then
    echo "ERROR: WSGI file not found at $(pwd)/rent_house_server/wsgi.py" >> /home/ec2-user/rent-house-app/deploy.log
    ls -la rent_house_server/ >> /home/ec2-user/rent-house-app/deploy.log
    exit 1
fi

# Test Gunicorn configuration with detailed logging
echo "Testing Gunicorn configuration..." >> "$LOG_FILE"
gunicorn --bind 0.0.0.0:8000 --workers 2 --timeout 120 --log-file "$LOG_FILE" --log-level debug rent_house_server.wsgi:application --check-config >> "$LOG_FILE" 2>> "$LOG_FILE" || {
    echo "ERROR: Gunicorn configuration test failed!" >> /home/ec2-user/rent-house-app/deploy.log
    echo "Dumping last 50 lines of Gunicorn log:" >> /home/ec2-user/rent-house-app/deploy.log
    tail -n 50 "$LOG_FILE" >> /home/ec2-user/rent-house-app/deploy.log
    exit 1
}
echo "Gunicorn configuration test passed." >> /home/ec2-user/rent-house-app/deploy.log

# Start Gunicorn in background
echo "Starting Gunicorn at $(date)" >> "$LOG_FILE"
nohup gunicorn \
    --bind 0.0.0.0:8000 \
    --workers 2 \
    --timeout 120 \
    --access-logfile "$LOG_FILE" \
    --error-logfile "$LOG_FILE" \
    --capture-output \
    --log-level debug \
    rent_house_server.wsgi:application >> "$LOG_FILE" 2>&1 &

# Store the PID
GUNICORN_PID=$!
echo "Gunicorn started with PID: $GUNICORN_PID" >> "$LOG_FILE"
echo "Gunicorn started with PID: $GUNICORN_PID" >> /home/ec2-user/rent-house-app/deploy.log

# Wait for Gunicorn to start
echo "Waiting 15 seconds for Gunicorn to start..." >> /home/ec2-user/rent-house-app/deploy.log
sleep 15

# Check if Gunicorn is running
if ps -p $GUNICORN_PID > /dev/null; then
    echo "Gunicorn successfully started." >> "$LOG_FILE"
    echo "SUCCESS: Gunicorn started at $(date) with PID: $GUNICORN_PID" >> /home/ec2-user/rent-house-app/deploy.log

    # Verify it's listening on the port
    if netstat -tulpn 2>/dev/null | grep -q ":8000 "; then
        echo "Confirmed: Gunicorn is listening on port 8000" >> /home/ec2-user/rent-house-app/deploy.log
    else
        echo "WARNING: Gunicorn is running but not listening on port 8000!" >> /home/ec2-user/rent-house-app/deploy.log
        netstat -tulpn >> /home/ec2-user/rent-house-app/deploy.log 2>&1
        tail -n 50 "$LOG_FILE" >> /home/ec2-user/rent-house-app/deploy.log
        exit 1
    fi

    # Check connection to verify it's responding
    RESPONSE_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/ 2>/dev/null || echo "000")
    echo "HTTP response code: $RESPONSE_CODE" >> /home/ec2-user/rent-house-app/deploy.log
    if [ "$RESPONSE_CODE" -eq 200 ] || [ "$RESPONSE_CODE" -eq 301 ] || [ "$RESPONSE_CODE" -eq 302 ]; then
        echo "SUCCESS: Gunicorn is responding correctly on port 8000" >> /home/ec2-user/rent-house-app/deploy.log
    else
        echo "WARNING: Gunicorn is running but not responding correctly (HTTP $RESPONSE_CODE)" >> /home/ec2-user/rent-house-app/deploy.log
        tail -n 50 "$LOG_FILE" >> /home/ec2-user/rent-house-app/deploy.log
        exit 1
    fi

    exit 0
else
    echo "ERROR: Gunicorn failed to start!" >> "$LOG_FILE"
    echo "FAILURE: Gunicorn failed to start at $(date)" >> /home/ec2-user/rent-house-app/deploy.log

    # Dump recent log entries for debugging
    echo "Last 50 lines of Gunicorn log:" >> /home/ec2-user/rent-house-app/deploy.log
    tail -n 50 "$LOG_FILE" >> /home/ec2-user/rent-house-app/deploy.log

    # Check Python environment
    echo "Python path: $(which python)" >> /home/ec2-user/rent-house-app/deploy.log
    echo "Python version: $(python --version)" >> /home/ec2-user/rent-house-app/deploy.log

    # Check system resources
    echo "Memory usage:" >> /home/ec2-user/rent-house-app/deploy.log
    free -m >> /home/ec2-user/rent-house-app/deploy.log
    echo "Disk space:" >> /home/ec2-user/rent-house-app/deploy.log
    df -h >> /home/ec2-user/rent-house-app/deploy.log

    exit 1
fi