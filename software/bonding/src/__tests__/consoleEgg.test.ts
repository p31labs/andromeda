
      act(() => {
        result.current.triggerLarmor();
      });

      // Check that an oscillator was created
      expect(createdOscillators.length).toBeGreaterThan(0);


      act(() => {
        result.current.triggerLarmor();
      });



      // Before calling, no audio context
      const initialCount = createdOscillators.length;

      act(() => {
        result.current.triggerLarmor();
      });


      act(() => {
        result.current.lockTone();
      });


      expect(typeof (window as any).triggerLarmor).toBe('function');
      expect(typeof (window as any).lockTone).toBe('function');

      unmount();


      unmount();


      act(() => {
        result.current.triggerLarmor();
      });


      act(() => {
        result.current.lockTone();
      });

});
