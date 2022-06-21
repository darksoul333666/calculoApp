import React from 'react';
import { Colors } from './utils';
import { StatusBar } from 'react-native';
import Spinner from 'react-native-spinkit';
import { Modal, Text, useTheme } from '@ui-kitten/components';

const Loading = ({
  visible,
  text,
  backdropColor,
  barStyle,
  colorSpinner,
  statusText,
}) => {
  const theme = useTheme();
  const { backdropModal } = Colors;

  return (
    <Modal
      visible={visible}
      backdropStyle={{ backgroundColor: backdropColor || backdropModal }}
      style={{ alignItems: 'center' }}>
      <StatusBar
        backgroundColor={backdropColor || backdropModal}
        barStyle={`${barStyle || 'light'}-content`}
        hidden={false}
      />

      <Spinner
        style={{
          marginBottom: 20,
          alignSelf: 'center',
        }}
        size={80}
        isVisible={visible}
        type="FadingCircleAlt"
        color={colorSpinner || theme['color-basic-default']}
      />

      {text !== '' && (
        <Text
          status={statusText || 'control'}
          style={{ textAlign: 'center' }}
          category="h6">
          {text || 'Cargando...'}
        </Text>
      )}
    </Modal>
  );
};

export default Loading;
