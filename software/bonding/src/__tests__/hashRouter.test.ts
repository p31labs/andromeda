
      const { result } = renderHook(() => useHashRouter());


      const { result } = renderHook(() => useHashRouter());


      const { result } = renderHook(() => useHashRouter());


      const { result } = renderHook(() => useHashRouter());


      const { result } = renderHook(() => useHashRouter());

      act(() => {
        result.current.navigate('collider');
      });


      const { result } = renderHook(() => useHashRouter());



      const { result } = renderHook(() => useHashRouter());


      const { result } = renderHook(() => useHashRouter());


      expect(result.current.currentRoom).toBe('collider');



      const { unmount } = renderHook(() => useHashRouter());


      unmount();


      const { result } = renderHook(() => useHashRouter());


      const { result } = renderHook(() => useHashRouter());

});
