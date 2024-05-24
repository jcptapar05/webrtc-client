"use client";
import Room from "@/components/Room";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";

export default function Home() {
 const router = useRouter();
 const [username, setUsername] = useState("");
 const [roomId, setRoomId] = useState("");

 const joinRoom = () => {
  localStorage.setItem("username", username);
  setRoomId(uuid());
 };

 useEffect(() => {
  setRoomId(uuid());
 }, []);

 return (
  <div>
   <input
    type="text"
    value={username}
    placeholder="Enter you name"
    onChange={(e) => setUsername(e.target.value)}
   />
   <button onClick={joinRoom}>
    <a href={`/room/${roomId}`}>Enter Room</a>
   </button>
  </div>
 );
}
