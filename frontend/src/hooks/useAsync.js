import { useCallback, useEffect, useState } from 'react';

/**
 * Chạy hàm bất đồng bộ mỗi khi deps đổi. Trả về { status: 'loading' | 'ready' | 'error', data, error, reload }.
 * Kết quả cũ bị bỏ khi deps đã đổi hoặc component đã gỡ, nên không bị ghi đè nhầm.
 */
export function useAsync(loader, deps) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    setState((previous) => ({ ...previous, status: 'loading', error: null }));
    loader().then(
      (data) => current && setState({ status: 'ready', data, error: null }),
      (error) => current && setState({ status: 'error', data: null, error }),
    );
    return () => { current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, reload };
}
