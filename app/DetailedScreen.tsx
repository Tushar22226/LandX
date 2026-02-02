// DetailScreen.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { RouteProp } from "@react-navigation/native";
import { LandRecord } from "./components/types";

interface DetailScreenProps {
  route: RouteProp<{ params: { record: LandRecord } }, "params">;
}

const DetailScreen: React.FC<DetailScreenProps> = ({ route }) => {
  const { record } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Land Record Details</Text>
      <Text>Survey Number: {record.surveyNumber}</Text>
      <Text>Transfer Status: {record.transferStatus}</Text>
      <Text>Owner Name: {record.ownerName}</Text>
      {record.transferStatus === "completed" && record.previousOwner && (
        <Text>Previous Owner: {record.previousOwner}</Text>
      )}
      {/* Render additional details as needed */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
});

export default DetailScreen;
