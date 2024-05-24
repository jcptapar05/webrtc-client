"use client";

import Peer from "peerjs";
import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import VideoPlayer from "./VideoPlayer";
import { useParams } from "next/navigation";
import RecordRTC, { invokeSaveAsDialog } from "recordrtc";
import Hydration from "./Hydration";
import dynamic from "next/dynamic";

const socket = io("http://localhost:5000");

dynamic(() => import("./Room"), {
 ssr: false,
});

const Room = () => {
 const params = useParams();
 const [peerId, setPeerId] = useState<any>();
 const [stream, setStream] = useState<any>();
 const [remoteStream, setRemoteStream] = useState<any[]>([]);
 const [micStatus, setMicStatus] = useState<boolean>(false);
 const [username, setName] = useState(
  typeof window !== "undefined" && localStorage.getItem("username")
 );

 const [screenStream, setScreenStream] = useState<any>();
 const [blob, setBlob] = useState<any>(null);
 const refRecordVideo = useRef(null);
 let recorderRef = useRef<any>();

 useEffect(() => {
  const peer = new Peer(uuidv4().toString());

  setPeerId(peer);
  peer.on("open", (id) => {
   socket.emit("join-room", {
    roomId: params.id,
    userId: id,
    metadata: { name: username },
   });
  });

  navigator.mediaDevices
   .getUserMedia({ video: true, audio: true })
   .then((stream: MediaStream) => {
    setStream(stream);
   });

  socket.on("user-disconnected", (userId) => {
   setRemoteStream((prev) => {
    return prev.filter((item: any) => item.userId != userId);
   });
  });

  return () => {
   socket.disconnect();
   peer.destroy();
  };
 }, []);

 useEffect(() => {
  if (!peerId || !stream) return;

  const handleUserConnected = ({ userId, metadata }: any) => {
   console.log(metadata);
   const call = peerId.call(userId, stream, {
    metadata: {
     name: typeof window !== "undefined" && localStorage.getItem("username"),
    },
   });

   call.on("stream", (userVideoStream: MediaStream) => {
    setRemoteStream((prev) => {
     const isExist = prev.find((item) => item.userId === userId);
     if (!isExist) {
      return [
       ...prev,
       {
        userId,
        remoteVideoStream: userVideoStream,
        name: metadata.name,
       },
      ];
     }
     return prev;
    });
   });
  };

  const handleCall = (call: any) => {
   console.log(call);
   const username = call.metadata?.name;
   call.answer(stream);
   call.on("stream", (remoteVideoStream: MediaStream) => {
    setRemoteStream((prev) => {
     const isExist = prev.find((item) => item.userId === call.peer);
     if (!isExist) {
      return [
       ...prev,
       {
        userId: call.peer,
        remoteVideoStream,
        name: username,
       },
      ];
     }
     return prev;
    });
   });
  };

  socket.on("user-connected", handleUserConnected);
  peerId.on("call", handleCall);

  return () => {
   socket.off("user-connected", handleUserConnected);
   peerId.off("call", handleCall);
  };
 }, [peerId, stream]);

 const toggleVideo = async () => {
  if (stream) {
   const tracks = stream.getVideoTracks();
   tracks.forEach((track: any) => (track.enabled = !track.enabled));
  }
 };

 const toggleMic = async () => {
  if (stream) {
   const tracks = stream.getAudioTracks();
   tracks.forEach((track: any) => (track.enabled = !track.enabled));
   setMicStatus((prev) => (prev = !prev));
   socket.emit("mic-sent", { userId: peerId._id, status: !micStatus });
  }
 };

 const handleRecording = async () => {
  const mediaRecordStream = await navigator.mediaDevices.getDisplayMedia({
   video: true,
   audio: true,
  });

  setScreenStream(mediaRecordStream);

  // Mix the local and remote audio streams
  let audioContext = new (window.AudioContext || window.AudioContext)();
  let destination = audioContext.createMediaStreamDestination();

  // Combine local audio
  let localAudioSource = audioContext.createMediaStreamSource(stream);
  localAudioSource.connect(destination);

  // Combine remote audio
  remoteStream.forEach(({ remoteVideoStream }) => {
   let remoteAudioSource =
    audioContext.createMediaStreamSource(remoteVideoStream);
   remoteAudioSource.connect(destination);
  });

  // Mixed audio stream
  let mixedAudioStream = destination.stream;

  // Prepare final stream with video and mixed audio
  let finalStream = new MediaStream();
  mediaRecordStream
   .getVideoTracks()
   .forEach((track) => finalStream.addTrack(track));
  mixedAudioStream
   .getAudioTracks()
   .forEach((track) => finalStream.addTrack(track));

  recorderRef.current = new RecordRTC(finalStream, { type: "video" });
  recorderRef.current.startRecording();
 };

 const handleStop = () => {
  recorderRef.current.stopRecording(() => {
   setBlob(recorderRef.current.getBlob());
  });
 };

 const handleSave = () => {
  invokeSaveAsDialog(blob);
 };

 //  useEffect(() => {
 //   socket.on("mic-received", ({ userId, status }) => {
 //    setRemoteStream((prev) => {
 //     const isExist = prev.findIndex((item) => item.userId === userId);
 //     if (isExist !== -1) {
 //      const updatedUser = {
 //       ...prev[isExist],
 //       muted: status,
 //      };
 //      const updatedStream = [...prev];
 //      updatedStream[isExist] = updatedUser;
 //      return updatedStream;
 //     }
 //     return prev;
 //    });
 //   });
 //  }, []);

 return (
  <Hydration>
   <div className="w-screen h-screen overflow-x-hidden">
    <div className="flex justify-evenly">
     <button onClick={toggleVideo}>Toggle Video</button>
     <button onClick={toggleMic}>Toggle Mic</button>
     <button onClick={handleRecording}>start</button>
     <button onClick={handleStop}>stop</button>
     <button onClick={handleSave}>save</button>
    </div>
    <div
     className={`grid place-items-center grid-flow-row gap-4 w-100 h-100 p-4 ${
      remoteStream.length === 0
       ? "grid-cols-1"
       : remoteStream.length === 1
       ? "grid-cols-1 md:grid-cols-2"
       : remoteStream.length >= 2
       ? "lg:grid-cols-3 md:grid-cols-2 grid-cols-1"
       : ""
     }`}
    >
     <div
      id={peerId?._id}
      className="relative"
     >
      <VideoPlayer
       muted={true}
       stream={stream}
      ></VideoPlayer>
      <p className="absolute bottom-2 left-2 bg-black text-white">{username}</p>
     </div>

     {remoteStream.length > 0 &&
      remoteStream.map((peer, index) => (
       <div
        key={peer.userId}
        id={peer.userId}
        className="relative"
       >
        <VideoPlayer
         muted={false}
         stream={peer.remoteVideoStream}
        ></VideoPlayer>
        {peer.muted && (
         <p className="absolute right-2 top-2 bg-black text-white p-1 rounded-xl">
          muted
         </p>
        )}
        <p className="absolute bottom-2 left-2 bg-black text-white">
         {peer.name}
        </p>
       </div>
      ))}
    </div>

    {blob && (
     <video
      src={URL.createObjectURL(blob)}
      controls
      autoPlay
      ref={refRecordVideo}
      style={{ width: "700px", margin: "1em" }}
     />
    )}
   </div>
  </Hydration>
 );
};

export default Room;
