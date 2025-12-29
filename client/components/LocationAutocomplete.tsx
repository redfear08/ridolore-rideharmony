import React, { useState, useCallback, useRef, useEffect } from "react";
import { StyleSheet, View, TextInput, Pressable, ScrollView, Platform, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

interface LocationSuggestion {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface LocationAutocompleteProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelectLocation: (location: LocationSuggestion) => void;
  placeholder?: string;
  showCurrentLocation?: boolean;
  onCurrentLocationPress?: () => void;
  isLocating?: boolean;
}

const COMMON_LOCATIONS = [
  { name: "Mumbai Central", region: "Mumbai, Maharashtra" },
  { name: "Delhi NCR", region: "New Delhi" },
  { name: "Bangalore Tech Park", region: "Bangalore, Karnataka" },
  { name: "Chennai Central", region: "Chennai, Tamil Nadu" },
  { name: "Hyderabad", region: "Hyderabad, Telangana" },
  { name: "Pune", region: "Pune, Maharashtra" },
  { name: "Kolkata", region: "Kolkata, West Bengal" },
  { name: "Ahmedabad", region: "Ahmedabad, Gujarat" },
  { name: "Jaipur", region: "Jaipur, Rajasthan" },
  { name: "Lucknow", region: "Lucknow, Uttar Pradesh" },
  { name: "San Francisco", region: "California, USA" },
  { name: "New York", region: "New York, USA" },
  { name: "Los Angeles", region: "California, USA" },
  { name: "Chicago", region: "Illinois, USA" },
  { name: "Houston", region: "Texas, USA" },
  { name: "London", region: "England, UK" },
  { name: "Sydney", region: "NSW, Australia" },
  { name: "Singapore", region: "Singapore" },
  { name: "Dubai", region: "UAE" },
  { name: "Tokyo", region: "Japan" },
];

export function LocationAutocomplete({
  value,
  onChangeText,
  onSelectLocation,
  placeholder = "Search location",
  showCurrentLocation = false,
  onCurrentLocationPress,
  isLocating = false,
}: LocationAutocompleteProps) {
  const { theme } = useTheme();
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, []);

  const searchLocations = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);

    try {
      const filteredCommon = COMMON_LOCATIONS
        .filter(loc => 
          loc.name.toLowerCase().includes(query.toLowerCase()) ||
          loc.region.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 5)
        .map((loc, index) => ({
          id: `common-${index}`,
          name: loc.name,
          address: loc.region,
          latitude: 0,
          longitude: 0,
        }));

      if (filteredCommon.length > 0) {
        setSuggestions(filteredCommon);
        setShowSuggestions(true);
      }

      if (Platform.OS !== "web") {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const geocoded = await Location.geocodeAsync(query);
          
          if (geocoded.length > 0) {
            const geocodedSuggestions = await Promise.all(
              geocoded.slice(0, 3).map(async (coord, index) => {
                const [address] = await Location.reverseGeocodeAsync({
                  latitude: coord.latitude,
                  longitude: coord.longitude,
                });
                
                const name = address?.name || address?.street || query;
                const addressParts = [
                  address?.city,
                  address?.region,
                  address?.country,
                ].filter(Boolean);
                
                return {
                  id: `geo-${index}`,
                  name: name,
                  address: addressParts.join(", ") || "Location found",
                  latitude: coord.latitude,
                  longitude: coord.longitude,
                };
              })
            );

            const existingNames = new Set(filteredCommon.map(s => s.name.toLowerCase()));
            const uniqueGeocoded = geocodedSuggestions.filter(
              s => !existingNames.has(s.name.toLowerCase())
            );

            setSuggestions([...filteredCommon, ...uniqueGeocoded].slice(0, 6));
          }
        }
      }
    } catch (error) {
      console.log("Location search error:", error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleTextChange = useCallback((text: string) => {
    onChangeText(text);
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (text.length >= 2) {
      searchTimeout.current = setTimeout(() => {
        searchLocations(text);
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [onChangeText, searchLocations]);

  const handleSelectSuggestion = useCallback((suggestion: LocationSuggestion) => {
    onChangeText(`${suggestion.name}, ${suggestion.address}`);
    onSelectLocation(suggestion);
    setShowSuggestions(false);
    setSuggestions([]);
    inputRef.current?.blur();
  }, [onChangeText, onSelectLocation]);

  const handleFocus = useCallback(() => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  }, [suggestions.length]);

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <View style={styles.inputWrapper}>
          <Feather 
            name="search" 
            size={18} 
            color={theme.textSecondary} 
            style={styles.searchIcon}
          />
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundDefault,
                color: theme.text,
                borderColor: showSuggestions ? theme.primary : theme.border,
              },
            ]}
            placeholder={placeholder}
            placeholderTextColor={theme.textSecondary}
            value={value}
            onChangeText={handleTextChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            autoCorrect={false}
            autoCapitalize="words"
          />
          {isSearching ? (
            <ActivityIndicator 
              size="small" 
              color={theme.primary} 
              style={styles.loadingIcon}
            />
          ) : value.length > 0 ? (
            <Pressable 
              style={styles.clearButton}
              onPress={() => {
                onChangeText("");
                setSuggestions([]);
                setShowSuggestions(false);
              }}
              hitSlop={8}
            >
              <Feather name="x-circle" size={18} color={theme.textSecondary} />
            </Pressable>
          ) : null}
        </View>
        
        {showCurrentLocation ? (
          <Pressable
            style={({ pressed }) => [
              styles.locationButton,
              { backgroundColor: theme.primary, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={onCurrentLocationPress}
            disabled={isLocating}
          >
            {isLocating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Feather name="navigation" size={20} color="#FFFFFF" />
            )}
          </Pressable>
        ) : null}
      </View>

      {showSuggestions && suggestions.length > 0 ? (
        <View 
          style={[
            styles.suggestionsContainer, 
            { 
              backgroundColor: theme.backgroundRoot,
              borderColor: theme.border,
            }
          ]}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            style={styles.suggestionsList}
          >
            {suggestions.map((item, index) => (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  styles.suggestionItem,
                  { 
                    backgroundColor: pressed ? theme.backgroundSecondary : "transparent",
                    borderBottomColor: theme.border,
                    borderBottomWidth: index < suggestions.length - 1 ? 1 : 0,
                  },
                ]}
                onPress={() => handleSelectSuggestion(item)}
              >
                <View style={[styles.suggestionIcon, { backgroundColor: theme.primary + "20" }]}>
                  <Feather name="map-pin" size={16} color={theme.primary} />
                </View>
                <View style={styles.suggestionText}>
                  <ThemedText type="body" style={{ fontWeight: "500" }} numberOfLines={1}>
                    {item.name}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }} numberOfLines={1}>
                    {item.address}
                  </ThemedText>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    zIndex: 1000,
  },
  inputRow: {
    flexDirection: "row",
  },
  inputWrapper: {
    flex: 1,
    position: "relative",
  },
  searchIcon: {
    position: "absolute",
    left: Spacing.md,
    top: "50%",
    marginTop: -9,
    zIndex: 1,
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    paddingLeft: Spacing.xl + Spacing.md,
    paddingRight: Spacing.xl + Spacing.sm,
    fontSize: 16,
    borderWidth: 1,
  },
  loadingIcon: {
    position: "absolute",
    right: Spacing.md,
    top: "50%",
    marginTop: -10,
  },
  clearButton: {
    position: "absolute",
    right: Spacing.md,
    top: "50%",
    marginTop: -9,
  },
  locationButton: {
    width: Spacing.inputHeight,
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.sm,
  },
  suggestionsContainer: {
    position: "absolute",
    top: Spacing.inputHeight + Spacing.xs,
    left: 0,
    right: 0,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    maxHeight: 280,
    ...Shadows.card,
    zIndex: 1001,
  },
  suggestionsList: {
    maxHeight: 280,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    minHeight: 56,
  },
  suggestionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  suggestionText: {
    flex: 1,
  },
});
