 *

  if (!visible) return null;

  return (
    <div
    <div
      className="room-hud-layer"
    <div
      className="router-nav-layer"
    <div
      className="toast-layer"
    <div
      className="modal-layer"
    <div
      className="centaur-layer"
    <div
      className="boot-layer"
    <div
      className="onboarding-layer"



      {/* Z-10: Room HUD */}
      {hasRoomHUD && <RoomHUDLayer>{roomHUD}</RoomHUDLayer>}

      {/* Z-11: Router Nav */}
      {hasRouterNav && <RouterNavLayer>{routerNav}</RouterNavLayer>}

      {/* Z-50: System Toasts */}
      {hasToasts && <ToastLayer>{toasts}</ToastLayer>}

      {/* Z-60: Modals */}
      {hasModals && <ModalLayer>{modals}</ModalLayer>}

      {/* Z-80: Centaur Terminal */}
      {hasCentaur && <CentaurLayer>{centaur}</CentaurLayer>}

      {/* Z-100: Boot Screen */}
      {hasBoot && <BootLayer>{boot}</BootLayer>}



