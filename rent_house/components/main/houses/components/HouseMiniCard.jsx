import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useTheme } from "../../../../contexts/ThemeContext";
import { formatCurrency } from "../../../../utils/Tools";

export const HouseMiniCard = React.memo(({ house, onPress }) => {
  const { colors } = useTheme();

  const thumbnail = house.thumbnail || "https://via.placeholder.com/150";

  const hasAvailableRooms =
    house.max_rooms && house.current_rooms < house.max_rooms;

  const getHouseTypeText = (type) => {
    const types = {
      house: "Nhà riêng",
      apartment: "Căn hộ",
      dormitory: "Ký túc xá",
      room: "Phòng trọ",
    };
    return types[type] || "Nhà";
  };

  const icons = {
    house: "home",
    apartment: "home-city",
    dormitory: "school",
    room: "bed",
  };

  const format_houses_Type = (house) => {
    if (house.type === "house" || house.type === "apartment") {
      return (
        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Icon
              name={icons[house.type]}
              size={16}
              color={colors.accentColor}
            />
            <Text style={[styles.statText, { color: house.is_renting ? colors.dangerColor : colors.successColor }]}>
              {" "}
              {!house.is_renting ? "Còn trống" : "Đã cho thuê"}
            </Text>
          </View>
          <View style={styles.stat}>
            <Icon name="account-group" size={16} color={colors.successColor} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              {" "}
              {house.max_people || 0} người
            </Text>
          </View>
        </View>
      );
    }
    if (house.type === "dormitory" || house.type === "room") {
      return (
        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Icon
              name={icons[house.type]}
              size={16}
              color={colors.accentColor}
            />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              <Text style={[styles.statText, { color: house.max_rooms > house.current_rooms  ?  colors.successColor :  colors.dangerColor}]}>
                {" "}
                {house.max_rooms > house.current_rooms 
                  ? "Còn"
                  : "Hết" || 0}{" "}
                phòng
              </Text>
            </Text>
          </View>
          <View style={styles.stat}>
            <Icon name="account-group" size={16} color={colors.successColor} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              {" "}
              {house.max_people || 0} người
            </Text>
          </View>
        </View>
      );
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: colors.backgroundSecondary },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: thumbnail }} style={styles.image} />

        {house.is_verified && (
          <View
            style={[
              styles.verifiedBadge,
              { backgroundColor: colors.successColor },
            ]}
          >
            <Icon name="check-circle" size={10} color="#fff" />
            <Text style={styles.verifiedText}>Đã xác thực</Text>
          </View>
        )}

        <View
          style={[styles.priceBadge, { backgroundColor: colors.accentColor }]}
        >
          <Text style={styles.priceText}>
            {formatCurrency(house.base_price)}
          </Text>
        </View>
      </View>

      <View style={styles.contentContainer}>
        <Text
          style={[styles.title, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {house.title}
        </Text>

        <Text
          style={[styles.address, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {house.address}
        </Text>

        <View style={styles.detailsContainer}>
          <View style={styles.detailItem}>
            <Icon
              name={icons[house.type]}
              size={14}
              color={colors.textSecondary}
            />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              {getHouseTypeText(house.type)}
            </Text>
          </View>

          {house.distance !== undefined && (
            <View style={styles.detailItem}>
              <Icon name="map-marker" size={14} color={colors.textSecondary} />
              <Text
                style={[styles.detailText, { color: colors.textSecondary }]}
              >
                {house.distance.toFixed(1)} km
              </Text>
            </View>
          )}

          {
            <View style={styles.detailItem}>
              <Icon name="star" size={14} color="#FFD700" />
              <Text
                style={[styles.detailText, { color: colors.textSecondary }]}
              >
                {house.avg_rating ? house.avg_rating.toFixed(1) : "--"}
              </Text>
            </View>
          }

          {format_houses_Type(house)}
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  imageContainer: {
    position: "relative",
    height: 120,
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  verifiedBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedText: {
    color: "#fff",
    fontSize: 10,
    marginLeft: 2,
    fontWeight: "bold",
  },
  priceBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priceText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  contentContainer: {
    padding: 10,
  },
  title: {
    fontWeight: "bold",
    fontSize: 14,
    marginBottom: 4,
  },
  address: {
    fontSize: 12,
    marginBottom: 6,
    lineHeight: 16,
  },
  detailsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 12,
    marginLeft: 4,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
});
