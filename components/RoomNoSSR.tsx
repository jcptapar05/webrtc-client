import dynamic from "next/dynamic";

export const RoomNoSSR = dynamic(() => import("@/components/Room"), {
 ssr: false,
});
