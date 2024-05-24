"use client";
import React, { useEffect, useState } from "react";

const Hydration = ({ children }: any) => {
 const [isHydrated, setIsHydrated] = useState(false);
 useEffect(() => {
  setIsHydrated(true);
 }, []);

 return <>{isHydrated ? <div>{children}</div> : null}</>;
};

export default Hydration;
