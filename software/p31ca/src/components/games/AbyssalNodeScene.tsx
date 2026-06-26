if (!initialized.current) {
      simMat.uniforms.uInit.value = 1.0;
      gl.setViewport(0, 0, SIM_RES, SIM_RES);
      gl.setScissor(0, 0, SIM_RES, SIM_RES);
      gl.setScissorTest(true);
       gl.setRenderTarget(readFBO.current);
       gl.render(simScene.scene, simScene.camera);
gl.setRenderTarget(null);
        // Restore viewport to canvas size
        gl.setViewport(0, 0, size.width, size.height);
        gl.setScissor(0, 0, size.width, size.height);
      // Set viewport and scissor for FBO render
      gl.setScissor(0, 0, SIM_RES, SIM_RES);
      gl.setScissorTest(true);

gl.setViewport(0, 0, SIM_RES, SIM_RES);
      gl.setScissor(0, 0, SIM_RES, SIM_RES);
     gl.setRenderTarget(writeFBO.current);
     gl.render(simScene.scene, simScene.camera);
gl.setRenderTarget(null);
      gl.setViewport(0, 0, size.width, size.height);
      gl.setScissor(0, 0, size.width, size.height);
export default AbyssalNodeScene;
