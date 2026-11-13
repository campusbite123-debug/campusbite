import React from 'react';
import { View } from 'react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { Page, Brand } from '@/components/shell';
import { Button, T, s } from '@/components/ui';
export default function Credits() {
  return (
    <Page style={{ maxWidth: 700, paddingTop: 45 }}>
      <Brand />
      <View style={[s.card, { marginTop: 30, gap: 18 }]}>
        <T style={s.h1}>A little photo credit.</T>
        <T style={{ lineHeight: 23 }}>
          Chicken adobo meal 20231025: Ian Lopez (Ianlopez1115). Philippine Sisig: Theglennpalacio /
          Glenn Palacio Photography. Both photographs are used under Creative Commons
          Attribution-ShareAlike 4.0. They have been resized and recompressed and are displayed with
          a responsive crop. Their image licenses are retained.
        </T>
        <Button
          secondary
          onPress={() =>
            void Linking.openURL(
              'https://commons.wikimedia.org/wiki/File:Chicken_adobo_meal_20231025.jpg',
            )
          }
        >
          Adobo photo and original attribution
        </Button>
        <Button
          secondary
          onPress={() =>
            void Linking.openURL('https://commons.wikimedia.org/wiki/File:Philippine_Sisig.jpg')
          }
        >
          Sisig photo and original attribution
        </Button>
        <Button
          secondary
          onPress={() => void Linking.openURL('https://creativecommons.org/licenses/by-sa/4.0/')}
        >
          Read the CC BY-SA 4.0 license
        </Button>
        <T style={{ lineHeight: 23 }}>
          Other sample meal photography is from Unsplash, under the Unsplash License. Sample styling
          is illustrative. Canteen administrators can replace every photo.
        </T>
        <Button secondary onPress={() => void Linking.openURL('https://unsplash.com/license')}>
          Read the Unsplash license
        </Button>
        <Button onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
          Back to campusbite
        </Button>
      </View>
    </Page>
  );
}
