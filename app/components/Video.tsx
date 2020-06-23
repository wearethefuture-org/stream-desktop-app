import React, { useState, useEffect, useCallback } from 'react';
import { makeStyles } from '@material-ui/styles';
import { Fab, Box, Container } from '@material-ui/core';
import { MicOff, Save, Close, FiberManualRecord, MobileScreenShare, RotateRight, ArrowBackIos, ArrowForwardIos, GetApp } from '@material-ui/icons';
import User from '../model/User';
import { PassiveListener } from 'react-event-injector';

export const VIDEO_ELEMENT_ID = 'video-element';
export const VIDEO_CANVAS_ID = 'video-canvas';
export const DUMMY_VIDEO_ELEMENT = 'dummy-video-element';

const useStyles = makeStyles({
  canvasElement: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: '48px',
    margin: 'auto'
  },
  controlPanel: {
    position: 'fixed',
    bottom: '20px',
    display: 'flex',
    width: 'auto',
    left: '50%',
    transform: `translateX(calc(-50% + 350px / 2))`,
    justifyContent: 'center'
  },
  hidden: {
    display: 'none'
  },
  fullSize: {
    height: 'calc(100vh - 48px)',
    width: '100vw'
  },
  controlButton: {
    marginLeft: '12px',
    marginRight: '12px'
  }
});

export type VideoState = {
  recording?: Blob
};

type VideoProps = {
  hidden: boolean,
  onFlipSound: () => void,
  onStartRecording: () => void,
  onCallEnd: () => void,
  onVideoSave: () => void,
  onBackFrame: () => void,
  onForwardFrame: () => void,
  isRecording: boolean,
  subscriber: User | null,
  isPreview: boolean
};

const resizer = ({videoWidth, videoHeight}, {screenWidth, screenHeight}) => {
  const videoAspectRatio = videoHeight / videoWidth;
  const screenAspectRation = screenHeight / screenWidth;

  if (videoAspectRatio > screenAspectRation) {
    return {
      height: '100%',
      width: `calc(${screenHeight}px * ${1 / videoAspectRatio})`
    };
  } else {
    return {
      height: `calc(${screenWidth}px * ${videoAspectRatio})`,
      width: '100%'
    };
  }
};

let scale = 1;

const Video: React.FC<VideoProps> = ({
  hidden,
  onFlipSound,
  onStartRecording,
  onCallEnd,
  subscriber,
  isPreview,
  onVideoSave,
  onBackFrame,
  onForwardFrame,
  isRecording
}) => {
  const classes = useStyles();
  const [isMirrored, setMirrored] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 'auto', height: 'auto' });
  const [canvasOrientation, setCanvasOrientation] = useState({ padding: '', transform: 'none' });
  const [rotation, setRotation] = useState(0);
  const muted = !subscriber?.dynamicData?.withAudio || false;

  const mirrorScreen = () => setMirrored(!isMirrored);

  const rotateRight = () => setRotation((rotation + 1) % 4);

  const wheelZoom = () => {
    const parentBox = document.getElementById('parent-box')!;
    return (event: WheelEvent) => {
      event.preventDefault();
      scale = Math.min(Math.max(scale + event.deltaY * -0.005, 0.75), 3);
      parentBox.style.transform = `scale(${scale})`;
    };
  };

  useEffect(() => {
    const canvas = document.getElementById(VIDEO_CANVAS_ID)! as HTMLCanvasElement;
    const videoSize = {
      videoWidth: canvas.width,
      videoHeight: canvas.height
    };

    const box = document.getElementById('parent-box')!;
    const boxWidth = +getComputedStyle(box).width.replace('px', '');
    const boxHeight = +getComputedStyle(box).height.replace('px', '');
    const boxSize = rotation % 2 == 0
      ? {
          screenWidth: boxWidth,
          screenHeight: boxHeight
        }
      : {
          screenWidth: boxHeight,
          screenHeight: boxWidth
        };

    setCanvasSize(resizer(videoSize, boxSize));
    const paddingArray = Array(4).fill(0);
    paddingArray[rotation] = 48;
    const padding = paddingArray.map(el => `${el}px`).join(' ');

    setCanvasOrientation({
      transform: `rotateY(${+isMirrored * 180}deg) rotate(${rotation * -90}deg)`,
      padding
    });
  }, [rotation, isMirrored]);

  useEffect(() => {
    scale = 1;

    const video = document.getElementById(VIDEO_ELEMENT_ID)! as HTMLVideoElement;
    const getVideoProps = () => ({
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight
    });

    const box = document.getElementById('parent-box')!;
    box.style.transform = 'scale(1)';
    const getScreenProps = () => ({
      screenWidth: +getComputedStyle(box).width.replace('px', ''),
      screenHeight: +getComputedStyle(box).height.replace('px', '')
    });

    video.addEventListener('resize', () => (
      setCanvasSize(resizer(getVideoProps(), getScreenProps()))
    ));

    window.onresize = () => setCanvasSize(resizer(getVideoProps(), getScreenProps()));

    document.getElementById('root-box')?.addEventListener('wheel', wheelZoom(), { passive: false });
  }, []);

  return (
      <Box id='root-box' className={`${classes.fullSize} ${hidden ? classes.hidden : ''}`}>
        <video id={DUMMY_VIDEO_ELEMENT} className={classes.hidden} />
        <video id={VIDEO_ELEMENT_ID} className={classes.hidden} />
        <div id='parent-box' style={{width:'100%', height:'100vh', position:'relative'}}>
          <canvas id={VIDEO_CANVAS_ID} className={classes.canvasElement} style={{...canvasSize, ...canvasOrientation}} />
        </div>
        <Container className={classes.controlPanel}>
          {
            isPreview
              ? <>
                <Fab className={classes.controlButton} onClick={onBackFrame}>
                  <ArrowBackIos />
                </Fab>
                <Fab className={classes.controlButton} onClick={onForwardFrame}>
                  <ArrowForwardIos />
                </Fab>
                <Fab className={classes.controlButton} onClick={mirrorScreen}>
                  <MobileScreenShare />
                </Fab>
                <Fab className={classes.controlButton} onClick={rotateRight}>
                  <RotateRight />
                </Fab>
                <Fab className={classes.controlButton} onClick={onVideoSave}>
                  <GetApp />
                </Fab>
              </> : <>
                <Fab className={classes.controlButton} onClick={onFlipSound}>
                  <MicOff color={muted ? 'secondary' : undefined} />
                </Fab>
                <Fab className={classes.controlButton} onClick={mirrorScreen}>
                  <MobileScreenShare />
                </Fab>
                <Fab className={classes.controlButton} onClick={rotateRight}>
                  <RotateRight />
                </Fab>
                <Fab className={classes.controlButton} onClick={onStartRecording}>
                  {isRecording ? <FiberManualRecord color='secondary' /> : <Save />}
                </Fab>
                <Fab color='secondary' className={classes.controlButton} onClick={onCallEnd}>
                  <Close />
                </Fab>
              </>
          }
        </Container>
      </Box>
  );
};

export default Video;
