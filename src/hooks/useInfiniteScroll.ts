import { useEffect, useCallback, useRef } from 'react';

interface UseInfiniteScrollOptions {
  onLoadMore: () => void;
  hasMore: boolean;
  threshold?: number; // How many items from the end to trigger loading
  isLoading?: boolean;
}

export const useInfiniteScroll = ({
  onLoadMore,
  hasMore,
  threshold = 5,
  isLoading = false
}: UseInfiniteScrollOptions) => {
  const observerRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasMore && !isLoading) {
        onLoadMore();
      }
    },
    [onLoadMore, hasMore, isLoading]
  );

  useEffect(() => {
    const element = sentinelRef.current;
    if (!element || !hasMore) return;

    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
      rootMargin: '100px'
    });

    observer.observe(element);

    return () => {
      if (element) observer.unobserve(element);
    };
  }, [handleObserver, hasMore]);

  return { sentinelRef, observerRef };
};