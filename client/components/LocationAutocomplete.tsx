import React, { useState, useCallback, useRef, useEffect } from "react";
import { StyleSheet, View, TextInput, Pressable, ScrollView, Platform, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import Constants from "expo-constants";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

interface LocationSuggestion {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  placeId?: string;
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

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey || process.env.GOOGLE_MAPS_API_KEY || "";

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

  const searchWithGooglePlaces = useCallback(async (query: string): Promise<LocationSuggestion[]> => {
    if (!GOOGLE_MAPS_API_KEY) {
      console.log("Google Maps API key not available");
      return [];
    }

    try {
      const autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}&types=geocode|establishment`;
      
      const response = await fetch(autocompleteUrl);
      const data = await response.json();

      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        console.log("Places API error:", data.status, data.error_message);
        return [];
      }

      if (!data.predictions || data.predictions.length === 0) {
        return [];
      }

      const suggestionsWithDetails: LocationSuggestion[] = await Promise.all(
        data.predictions.slice(0, 5).map(async (prediction: any, index: number) => {
          try {
            const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry,formatted_address,name&key=${GOOGLE_MAPS_API_KEY}`;
            const detailsResponse = await fetch(detailsUrl);
            const detailsData = await detailsResponse.json();

            if (detailsData.status === "OK" && detailsData.result) {
              const location = detailsData.result.geometry?.location;
              return {
                id: `google-${index}-${prediction.place_id}`,
                name: prediction.structured_formatting?.main_text || prediction.description.split(",")[0],
                address: prediction.structured_formatting?.secondary_text || prediction.description,
                latitude: location?.lat || 0,
                longitude: location?.lng || 0,
                placeId: prediction.place_id,
              };
            }
          } catch (error) {
            console.log("Error fetching place details:", error);
          }

          return {
            id: `google-${index}-${prediction.place_id}`,
            name: prediction.structured_formatting?.main_text || prediction.description.split(",")[0],
            address: prediction.structured_formatting?.secondary_text || prediction.description,
            latitude: 0,
            longitude: 0,
            placeId: prediction.place_id,
          };
        })
      );

      return suggestionsWithDetails;
    } catch (error) {
      console.log("Google Places search error:", error);
      return [];
    }
  }, []);

  const searchLocations = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);

    try {
      const googleResults = await searchWithGooglePlaces(query);
      
      if (googleResults.length > 0) {
        setSuggestions(googleResults);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.log("Location search error:", error);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchWithGooglePlaces]);

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
    const displayText = suggestion.address ? `${suggestion.name}, ${suggestion.address}` : suggestion.name;
    onChangeText(displayText);
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
