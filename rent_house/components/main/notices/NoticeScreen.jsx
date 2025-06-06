import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Divider, Menu } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNotificationCount } from '../../../contexts/NotificationCountContext';
import { useTheme } from '../../../contexts/ThemeContext';
import {
    deleteNotificationService,
    getNotificationsService,
    markAllNotificationsAsReadService,
    markNotificationAsReadService
} from '../../../services/notificationService';

import { NotificationCard } from "./NotificationCard";

export const NoticeScreen = () => {
    const { colors } = useTheme();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [nextPageUrl, setNextPageUrl] = useState(null);
    const [selectedNotification, setSelectedNotification] = useState(null);
    const [menuVisible, setMenuVisible] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const { resetNotificationCount, fetchUnreadNotifications, readedOneNotification } = useNotificationCount();
    const isFocused = useIsFocused();
    const navigation = useNavigation();
    
    const fetchNotifications = useCallback(async (isRefresh = false) => {
        if ((loading && !isRefresh) || (loadingMore && !isRefresh) || (refreshing && !isRefresh)) {
            return;
        }
        
        try {
            if (isRefresh) {
                setRefreshing(true);
                setNextPageUrl(null);
                setPage(1);
            } else if (nextPageUrl) {
                setLoadingMore(true);
            } else {
                setLoading(true);
            }
            
            setHasError(false);
            
            const response = await getNotificationsService(isRefresh ? null : nextPageUrl);
            
            if (response) {
                const { results, next } = response;
                
                if (results && Array.isArray(results)) {
                    setNotifications(prev => {
                        if (isRefresh) {
                            return results;
                        } else {
                            const existingIds = new Set(prev.map(item => item.id));
                            const newItems = results.filter(item => !existingIds.has(item.id));
                            return [...prev, ...newItems];
                        }
                    });
                    
                    setNextPageUrl(next);
                    setHasMore(!!next);
                    if (!isRefresh) {
                        setPage(page + 1);
                    }
                } else {
                    if (isRefresh) {
                        setNotifications([]);
                    }
                    setNextPageUrl(null);
                    setHasMore(false);
                }
            } else {
                throw new Error('Failed to fetch notifications');
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
            if (!isRefresh) {
                setHasError(true);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    }, [loading, loadingMore, refreshing, nextPageUrl, page]);
    
    useEffect(() => {
        fetchNotifications(true);
    }, []);
    
    useEffect(() => {
        if (isFocused) {
            resetNotificationCount();
        }
    }, [isFocused, resetNotificationCount]);

    const redirectToTargetScreen = ((notification) => {
        console.log('Redirecting to:', notification);
        type = notification?.type;
        switch (type) {
            case 'follow':
                navigation.navigate('PublicProfile', { username: notification.sender.username });
                break;
            case 'comment':
                navigation.navigate('PostDetail', { id: notification.related_object_id });
                break;
            case 'new_post':
                navigation.navigate('PostDetail', { id: notification.related_object_id });
                break;
            case 'new_house':
                navigation.navigate('HouseDetail', { id: notification.related_object_id });
                break;
            case 'rating':
                navigation.navigate('HouseDetail', { id: notification.related_object_id });
                break;
            case 'interaction':
                navigation.navigate('PostDetail', { id: notification.related_object_id });
                break;
            
        } 
        
    });

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        setNextPageUrl(null);
        fetchNotifications(true);
        resetNotificationCount();
    }, [fetchNotifications, resetNotificationCount]);
    
    const handleLoadMore = useCallback(() => {
        if (loadingMore || !hasMore || loading || refreshing) return;
        
        if (nextPageUrl) {
            fetchNotifications(false);
        }
    }, [loadingMore, hasMore, nextPageUrl, fetchNotifications, loading, refreshing]);

    const markAsRead = useCallback(async (notification) => {
        if (notification.is_read) return;

        try {
            await markNotificationAsReadService(notification.id);

            setNotifications(prev =>
                prev.map(item =>
                    item.id === notification.id
                        ? { ...item, is_read: true }
                        : item
                )
            );
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }, []);

    const handleNotificationPress = useCallback((notification) => {
        markAsRead(notification);
        fetchUnreadNotifications();
        redirectToTargetScreen(notification);
    }, [markAsRead, fetchUnreadNotifications]);

    const handleMenuPress = useCallback((notification) => {
        setSelectedNotification(notification);
        setMenuVisible(true);
    }, []);

    const handleMarkAllAsRead = useCallback(async () => {
        try {
            await markAllNotificationsAsReadService();
            setNotifications(prev => prev.map(item => ({ ...item, is_read: true })));
            setMenuVisible(false);
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    }, []);

    const handleDeleteNotification = useCallback(async () => {
        if (!selectedNotification) return;

        try {
            await deleteNotificationService(selectedNotification.id);
            setNotifications(prev => prev.filter(item => item.id !== selectedNotification.id));
            setMenuVisible(false);
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    }, [selectedNotification]);

    const renderError = () => (
        <View style={styles.centerContainer}>
            <Icon name="alert-circle-outline" size={50} color={colors.dangerColor} />
            <Text style={[styles.errorText, { color: colors.dangerColor }]}>
                Không thể tải thông báo
            </Text>
            <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: colors.accentColor }]}
                onPress={() => {
                    setLoading(true);
                    fetchNotifications();
                }}
            >
                <Text style={styles.retryButtonText}>Thử lại</Text>
            </TouchableOpacity>
        </View>
    );

    const renderEmpty = () => (
        <View style={styles.centerContainer}>
            <Icon name="bell-off-outline" size={50} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Chưa có thông báo nào
            </Text>
        </View>
    );

    const renderLoading = () => (
        <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.accentColor} />
            <Text style={{ marginTop: 10, color: colors.textSecondary }}>
                Đang tải thông báo...
            </Text>
        </View>
    );

    const renderFooter = useCallback(() => {
        if (!loadingMore) return null;

        return (
            <View style={styles.loadingFooter}>
                <ActivityIndicator size="small" color={colors.accentColor} />
                <Text style={{ color: colors.textSecondary, marginLeft: 10 }}>
                    Đang tải thêm...
                </Text>
            </View>
        );
    }, [loadingMore, colors.accentColor, colors.textSecondary]);

    return (
        <View style={[styles.container, { backgroundColor: colors.backgroundPrimary }]}>
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Thông báo</Text>

                <Menu
                    visible={menuVisible}
                    onDismiss={() => setMenuVisible(false)}
                    anchor={
                        <TouchableOpacity onPress={() => setMenuVisible(true)}
                            onDismiss={() => setMenuVisible(false)}
                        >
                            <Icon name="dots-horizontal" size={24} color={colors.textPrimary} />
                        </TouchableOpacity>
                    }
                    contentStyle={{ backgroundColor: colors.backgroundSecondary }}
                >
                    <Menu.Item
                        onPress={handleMarkAllAsRead}
                        title="Đánh dấu tất cả là đã đọc"
                        titleStyle={{ color: colors.textPrimary }}
                        leadingIcon="check-all"
                    />
                    {selectedNotification && (
                        <>
                            <Divider />
                            <Menu.Item
                                onPress={handleDeleteNotification}
                                title="Xóa thông báo này"
                                titleStyle={{ color: colors.dangerColor }}
                                leadingIcon="delete"
                            />
                        </>
                    )}
                </Menu>
            </View>

            {loading ? (
                renderLoading()
            ) : hasError ? (
                renderError()
            ) : notifications.length === 0 ? (
                renderEmpty()
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <NotificationCard
                            item={item}
                            onPress={handleNotificationPress}
                            onMenuPress={handleMenuPress}
                            colors={colors}
                        />
                    )}
                    contentContainerStyle={{
                        paddingBottom: 50,
                        flexGrow: notifications.length === 0 ? 1 : undefined,
                    }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            colors={[colors.accentColor]}
                            tintColor={colors.accentColor}
                        />
                    }
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.3} 
                    ListFooterComponent={renderFooter}
                    windowSize={3}
                    maxToRenderPerBatch={5}
                    updateCellsBatchingPeriod={100}
                    removeClippedSubviews={true}
                    initialNumToRender={7}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 10,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    notificationContainer: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: 0.5,
        borderBottomColor: '#E0E0E0',
    },
    avatarContainer: {
        aspectRatio: 1,
        width: 50,
        position: 'relative',
        marginRight: 16,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    iconOverlay: {
        position: 'absolute',
        bottom: -1,
        right: -1,
        padding: 3,
        borderRadius: 50,
        borderWidth: 1.5,
        borderColor: 'white',
    },
    notificationContent: {
        flex: 1,
        justifyContent: 'center',
    },
    senderName: {
        fontSize: 16,
        marginBottom: 2,
    },
    notificationText: {
        fontSize: 14,
        lineHeight: 18,
    },
    notificationTime: {
        fontSize: 12,
        marginTop: 4,
    },
    notificationBtn: {
        padding: 5,
        justifyContent: 'center',
    },
    loadingFooter: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 15,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        textAlign: 'center',
        marginTop: 10,
    },
    emptyText: {
        fontSize: 16,
        textAlign: 'center',
        marginTop: 10,
    },
    retryButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 5,
        marginTop: 15,
    },
    retryButtonText: {
        color: 'white',
        fontWeight: 'bold',
    }
});
