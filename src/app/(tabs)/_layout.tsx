import { NativeTabs } from 'expo-router/native-tabs';

import { C } from '@/lib/theme';

export default function TabsLayout() {
  return (
    <NativeTabs
      tintColor={C.accent}
      iconColor={C.muted}
      backgroundColor={C.surface}
      indicatorColor={C.elevated}
      labelStyle={{ color: C.muted }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Create</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="wand.and.sparkles" md="auto_awesome" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="designs">
        <NativeTabs.Trigger.Label>My Designs</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="square.grid.2x2" md="grid_view" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle" md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
