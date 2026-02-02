import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
}

export default function LandXLogo({ size = 'medium' }: LogoProps) {
  // Calculate logo size based on the size prop
  const getLogoSize = () => {
    switch(size) {
      case 'small': return 32;
      case 'large': return 64;
      case 'medium':
      default: return 48;
    }
  };

  const logoSize = getLogoSize();

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/logo_192.png')}
        style={{
          width: logoSize,
          height: logoSize,
          resizeMode: 'contain',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
