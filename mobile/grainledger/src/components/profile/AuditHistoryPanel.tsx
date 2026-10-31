import React, { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { api } from '../../services/api';
import { filterAuditEvents, parseAuditEvents, type AuditEvent } from '../../services/audit';
import { spacing } from '../../theme';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { InputField } from '../common/InputField';
import { AppText } from '../ui/AppText';
import { ListRow } from '../ui/ListRow';
import { EmptyState, ErrorState, LoadingState } from '../ui/States';

export function AuditHistoryPanel() {
  const [expanded, setExpanded] = useState(false);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(20);
  const inFlight = useRef(false);
  const filtered = filterAuditEvents(events, query);

  const load = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError(null);
    try {
      const result = await api.ledger.getHistory();
      if (result.error || result.isMock) throw new Error(result.error || 'Không thể kết nối máy chủ.');
      setEvents(parseAuditEvents(result.data));
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Không thể tải lịch sử.');
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  };

  return (
    <Card style={styles.card}>
      <View style={styles.content}>
        <AppText variant="title3" accessibilityRole="header">Lịch sử nghiệp vụ</AppText>
        <AppText variant="subheadline" color="secondaryLabel">Tra cứu sự kiện đã được máy chủ ghi nhận.</AppText>
        <Button title={expanded ? 'Thu gọn lịch sử' : 'Xem lịch sử nghiệp vụ'} variant="secondary" onPress={() => {
          setExpanded((value) => !value);
          if (!expanded) void load();
        }} />
        {expanded ? (
          <View style={styles.content}>
            <InputField label="Tìm sự kiện, mã lô hoặc người thực hiện" value={query} onChangeText={(value) => { setQuery(value); setLimit(20); }} autoCorrect={false} />
            <Button title="Tải lại lịch sử" variant="secondary" size="small" disabled={loading} onPress={() => { void load(); }} />
            {loading ? <LoadingState label="Đang tải lịch sử nghiệp vụ" /> : error ? (
              <ErrorState title="Chưa thể tải lịch sử" message={error} actionLabel="Thử lại" onAction={() => { void load(); }} />
            ) : filtered.length === 0 ? <EmptyState title={query.trim() ? 'Không có sự kiện phù hợp' : 'Chưa có sự kiện'} /> : (
              <>
                <AppText variant="footnote" color="secondaryLabel">{filtered.length} sự kiện</AppText>
                {filtered.slice(0, limit).map((event) => (
                  <ListRow key={event.id} title={`${event.eventType} · ${event.entityType}`}
                    subtitle={`${event.entityId}\n${event.timestamp} · Phiên bản ${event.version}${event.actorEmail ? `\n${event.actorEmail}` : ''}`} />
                ))}
                {filtered.length > limit ? <Button title="Xem thêm sự kiện" variant="secondary" onPress={() => setLimit((value) => value + 20)} /> : null}
              </>
            )}
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.lg },
  content: { gap: spacing.md },
});
