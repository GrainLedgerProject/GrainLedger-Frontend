import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { layout, spacing, useAppTheme } from '../../theme';
import { InputField } from '../common/InputField';
import { Button } from '../common/Button';
import { AppIcon } from './AppIcon';
import { AppText } from './AppText';

export function ChoiceField({ label, value, options, onChange, disabled = false }: {
  label: string; value: string; options: { value: string; label: string }[];
  onChange: (value: string) => void; disabled?: boolean;
}) {
  const theme = useAppTheme();
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(8);
  const filtered = options.filter((option) => option.label.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')));
  const selected = options.find((option) => option.value === value);
  return (
    <View style={styles.group}>
      <AppText variant="headline">{label}</AppText>
      {options.length > 8 ? <>
        <AppText variant="footnote" color="secondaryLabel">Đang chọn: {selected?.label ?? 'Chưa chọn'}</AppText>
        <InputField label={`Tìm ${label.toLocaleLowerCase('vi')}`} value={query} editable={!disabled} onChangeText={(text) => { setQuery(text); setLimit(8); }} />
      </> : null}
      {filtered.slice(0, limit).map((option) => (
        <Pressable key={option.value} accessibilityRole="radio" accessibilityLabel={option.label}
          accessibilityState={{ selected: value === option.value, disabled }} disabled={disabled}
          onPress={() => onChange(option.value)} style={[styles.choice, {
            borderRadius: theme.radii.sm, backgroundColor: value === option.value ? theme.colors.accentMuted : theme.colors.surfaceSecondary,
          }]}>
          <AppText style={styles.copy}>{option.label}</AppText>
          {value === option.value ? <AppIcon name="success" color={theme.colors.accent} /> : null}
        </Pressable>
      ))}
      {filtered.length === 0 ? <AppText variant="footnote" color="secondaryLabel">Không có lựa chọn phù hợp</AppText> : null}
      {filtered.length > limit ? <Button title="Xem thêm lựa chọn" size="small" variant="secondary" disabled={disabled} onPress={() => setLimit((count) => count + 8)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm }, choice: { minHeight: layout.minTouchTarget, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, copy: { flex: 1 },
});
