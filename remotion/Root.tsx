import React from "react";
import { Composition } from "remotion";
import { Video1Submission } from "./compositions/Video1Submission";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Video1-Submission"
        component={Video1Submission}
        durationInFrames={600}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
