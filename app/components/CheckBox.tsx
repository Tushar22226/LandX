import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

type CheckBoxProps = {
  checked: boolean;
  size?: number;
  color?: string;
  checkColor?: string;
};

export default function CheckBox({
  checked,
  size = 24,
  color = '#4a90e2',
  checkColor = '#fff'
}: CheckBoxProps) {
  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderColor: checked ? color : '#ccc',
          backgroundColor: checked ? color : '#fff'
        }
      ]}
    >
      {checked && <Feather name="check" size={size * 0.7} color={checkColor} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center'
  }
});
