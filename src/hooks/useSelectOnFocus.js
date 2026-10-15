import { useLayoutEffect, useRef } from 'react';

// Amount boxes show "1,200" and switch to the raw "1200" when focused. That
// swap drops the browser's own select-all on Tab, so typing used to add to the
// old number. Select the whole value right after the swap so typing replaces it.
export function useSelectOnFocus(focused) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    if (focused) ref.current?.select();
  }, [focused]);
  return ref;
}
