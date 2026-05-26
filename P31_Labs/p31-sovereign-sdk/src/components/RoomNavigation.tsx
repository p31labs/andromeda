import { useSovereignStore } from '../store/useSovereignStore';
import { ROOMS } from '../types';

export const RoomNavigationBar = () => {
  const { activeRoom, targetRoom, isRoomTransitioning, navigateRoom } = useSovereignStore();

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-50 bg-[#000a00]/80 p-2 border border-[#005500] backdrop-blur-md overflow-x-auto max-w-[95vw]">
      {ROOMS.map(room => {
        const isActive = activeRoom === room;
        const isTarget = targetRoom === room && isRoomTransitioning;

        let btnClass = "px-2 py-1 md:px-3 md:py-2 text-xs md:text-sm font-bold tracking-widest transition-all border whitespace-nowrap ";
        if (isActive && !isRoomTransitioning) {
          btnClass += "bg-[#39FF14] text-black border-[#39FF14] shadow-[0_0_10px_rgba(57,255,20,0.8)]";
        } else if (isTarget) {
          btnClass += "bg-[#39FF14] text-black border-[#39FF14] animate-pulse";
        } else {
          btnClass += "bg-transparent text-[#39FF14] border-transparent hover:border-[#39FF14]/50";
        }

        return (
          <button
            key={room}
            disabled={isRoomTransitioning}
            onClick={() => navigateRoom(room)}
            className={`${btnClass} disabled:cursor-not-allowed uppercase`}
          >
            {room}
          </button>
        );
      })}
    </div>
  );
};
