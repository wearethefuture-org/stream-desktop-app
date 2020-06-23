import React from 'react';
import { Drawer, AppBar, Box, Toolbar, Typography, CssBaseline, Theme, IconButton, Snackbar, BottomNavigationAction, BottomNavigation } from '@material-ui/core';
import ListIcon from '@material-ui/icons/List';
import SettingsIcon from '@material-ui/icons/Settings';
import { Subscriber, Stream, OpenVidu, Session, Connection, LocalRecorder, LocalRecorderState } from 'openvidu-browser';
import { ArrowBack } from '@material-ui/icons';
import { SERVER_ADDRESS_KEY, SESSION_KEY, store } from '../utils/store';
import { withRouter } from 'react-router';
import UserList from './UserList';
import { withStyles } from '@material-ui/styles';
import { getToken } from '../utils/openvidu';
import Video, { VIDEO_ELEMENT_ID, VIDEO_CANVAS_ID, VideoState, DUMMY_VIDEO_ELEMENT } from './Video';
import User, { UserDynamicData, BatteryStatus } from '../model/User';
import SettingsPage, { CanvasSettings } from './SettingsPage';

type SnackBarState = {
  open: boolean,
  message?: string
};

function sharpen(ctx, w, h, mix) {
  var x, sx, sy, r, g, b, a, dstOff, srcOff, wt, cx, cy, scy, scx,
      weights = [0, -1, 0, -1, 5, -1, 0, -1, 0],
      katet = Math.round(Math.sqrt(weights.length)),
      half = (katet * 0.5) | 0,
      dstData = ctx.createImageData(w, h),
      dstBuff = dstData.data,
      srcBuff = ctx.getImageData(0, 0, w, h).data,
      y = h;

  while (y--) {
      x = w;
      while (x--) {
          sy = y;
          sx = x;
          dstOff = (y * w + x) * 4;
          r = 0;
          g = 0;
          b = 0;
          a = 0;

          for (cy = 0; cy < katet; cy++) {
              for (cx = 0; cx < katet; cx++) {
                  scy = sy + cy - half;
                  scx = sx + cx - half;

                  if (scy >= 0 && scy < h && scx >= 0 && scx < w) {
                      srcOff = (scy * w + scx) * 4;
                      wt = weights[cy * katet + cx];

                      r += srcBuff[srcOff] * wt;
                      g += srcBuff[srcOff + 1] * wt;
                      b += srcBuff[srcOff + 2] * wt;
                      a += srcBuff[srcOff + 3] * wt;
                  }
              }
          }

          dstBuff[dstOff] = r * mix + srcBuff[dstOff] * (1 - mix);
          dstBuff[dstOff + 1] = g * mix + srcBuff[dstOff + 1] * (1 - mix);
          dstBuff[dstOff + 2] = b * mix + srcBuff[dstOff + 2] * (1 - mix);
          dstBuff[dstOff + 3] = srcBuff[dstOff + 3];
      }
  }

  ctx.putImageData(dstData, 0, 0);
}

type NavigationValue = 'users' | 'settings';

type PreviewState = {
  recorder: LocalRecorder
};

type HomeState = {
  users: User[],
  subscriber: Subscriber | null,
  snackbar: SnackBarState,
  nav: NavigationValue,
  preview: boolean,
  speed: number
};

enum SignalType {
  UPDATE_CAMERA = 'update-camera',
  FLIP_SOUND = 'flip-sound',
  DISCONNECT = 'disconnect',
  FETCH_STATUS = 'fetch-status',
  PUSH_STATUS = 'push-status',
};

export const drawerWidth = 350;

const styles = (theme: Theme) => ({
  drawer: {
    width: drawerWidth,
    flexShrink: 0
  },
  drawerComponent: {
    width: drawerWidth
  },
  box: {
    display: 'flex',
  },
  bar: {
    zIndex: theme.zIndex.drawer + 1
  },
  toolbar: {
    minHeight: '48px'
  },
  nav: {
    width: drawerWidth - 1,
    position: 'absolute',
    bottom: 0
  }
});

const FRAME_RATE_TIME = 1 / 30;

class Home extends React.Component<any, HomeState> {
  private serverAddress: string;
  private sessionName: string;
  private OV: OpenVidu | undefined;
  private session: Session | undefined;
  private videoElement: HTMLVideoElement | undefined;
  private dummyVideoElement: HTMLVideoElement | undefined;
  private canvasVideoElement: HTMLVideoElement | undefined;
  private canvas: HTMLCanvasElement | undefined;
  private canvasContext: CanvasRenderingContext2D | undefined;
  private recorder: LocalRecorder | undefined;
  private animationRequest: number | undefined;
  private prevSize: number = 0;
  private sharpnessRate: number = 0;
  private canvasSettings: CanvasSettings = {
    brightness: 100,
    contrast: 100,
    grayscale: 0,
    sharpness: 0
  };

  constructor(props: any) {
    super(props);
    this.state = {
      nav: 'users',
      users: [],
      subscriber: null,
      snackbar: {
        open: false
      },
      preview: false,
      speed: 0
    };

    this.onStreamSelected = this.onStreamSelected.bind(this);
    this.onFlipClicked = this.onFlipClicked.bind(this);
    this.recordingClicked = this.recordingClicked.bind(this);
    this.unsubscribe = this.unsubscribe.bind(this);
    this.closeSnackBar = this.closeSnackBar.bind(this);
    this.serverAddress = store.get(SERVER_ADDRESS_KEY);
    this.sessionName = store.get(SESSION_KEY);
    this.navClicked = this.navClicked.bind(this);
    this.updateCanvasSize = this.updateCanvasSize.bind(this);
    this.saveVideo = this.saveVideo.bind(this);
  }

  updateCanvasSize(event: any) {
    if (!this.playbackActive()) {
      this.canvas!.width = this.canvasVideoElement!.videoWidth;
      this.canvas!.height = this.canvasVideoElement!.videoHeight;
    }
  }

  updateCanvasVideoElement(video: HTMLVideoElement) {
    if (video === this.canvasVideoElement) return;
    this.canvasVideoElement?.removeEventListener('play', this.updateCanvasSize);
    this.canvasVideoElement?.removeEventListener('resize', this.updateCanvasSize);
    this.canvasVideoElement = video;
    this.canvasVideoElement.addEventListener('play', this.updateCanvasSize);
    this.canvasVideoElement.addEventListener('resize', this.updateCanvasSize);
  }

  drawFrame() {
    this.updateCanvasFilter();

    const video = this.canvasVideoElement!;
    this.canvasContext!.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

    if (this.canvasSettings.sharpness !== 0) {
      this.sharpenImage(this.canvasSettings.sharpness / 100);
    }
  }

  startAnimationFrame() {
    this.stopAnimationFrame();

    if (this.isStreaming()) {
      const drawer = () => {
        this.drawFrame();
        this.animationRequest = requestAnimationFrame(drawer);
      };

      this.animationRequest = requestAnimationFrame(drawer);
    }
  }

  stopAnimationFrame() {
    if (this.animationRequest !== undefined) {
      cancelAnimationFrame(this.animationRequest);
      this.animationRequest = undefined;
    }
  }

  async componentDidMount() {
    this.videoElement = document.getElementById(VIDEO_ELEMENT_ID)! as HTMLVideoElement;
    this.dummyVideoElement = document.getElementById(DUMMY_VIDEO_ELEMENT)! as HTMLVideoElement;
    this.canvas = document.getElementById(VIDEO_CANVAS_ID)! as HTMLCanvasElement;
    this.canvasContext = this.canvas.getContext('2d')!;

    this.updateCanvasVideoElement(this.videoElement);

    let keyDownInterval: any;
    let lastKeyDown: string | undefined;

    const keyDownListener = (event: KeyboardEvent) => {
      const code = event.code;
      event.preventDefault()
      const performAction = () => {
        switch (code) {
          case 'Space':
            //event.preventDefault();
            this.togglePreview();
            return;
          case 'ArrowLeft':
            //event.preventDefault();
            this.selectFrame(-1);
            return;
          case 'ArrowRight':
            //event.preventDefault();
            this.selectFrame(1);
            return;
          case 'ArrowUp':
            //event.preventDefault();
            this.selectFrame(-5);
            return;
          case 'ArrowDown':
            //event.preventDefault();
            this.selectFrame(5);
            return;
        }
      };

      if (event.repeat) {
        if (keyDownInterval !== undefined) {
          if (lastKeyDown === code) {
            //event.preventDefault();
            return;
          }
          clearInterval(keyDownInterval);
        }

        if (!(code === 'ArrowLeft' || code === 'ArrowRight' || code === 'ArrowUp' || code === 'ArrowDown')) return;

        keyDownInterval = setInterval(() => performAction(), 350);
        lastKeyDown = code;
      } else {
        performAction();
      }
    };

    window.addEventListener('keydown', keyDownListener, { passive: false });

    window.onkeyup = () => {
      if (keyDownInterval !== undefined) {
        clearInterval(keyDownInterval);
        keyDownInterval = undefined;
        lastKeyDown = undefined;
      }
    };

    setInterval(() => {
      if (this.isStreaming()) {
        const blob = this.recorder?.fetchBlob();

        if (this.playbackActive()) {
          const currentTime = this.videoElement!.currentTime;
          const url = this.videoElement!.src;
          this.videoElement!.src = window.URL.createObjectURL(blob);
          window.URL.revokeObjectURL(url);
          this.videoElement!.autoplay = false;
          this.videoElement!.currentTime = currentTime;
        }

        if (blob !== undefined) {
          const speed = (blob.size - this.prevSize) / 2;
          this.prevSize = blob.size;
          this.setState(state => ({ ...state, speed }));
        }
      } else {
        this.prevSize = 0;
        this.setState(state => ({ ...state, speed: 0 }));
      }
    }, 3000);

    await this.connect();
  }

  async componentWillUnmount() {
    await this.disconnect();
  }

  addStream(stream: Stream) {
    this.sendSignal(stream.connection, SignalType.FETCH_STATUS);

    this.setState((state: HomeState) => {
      const users = state.users;
      const user = {
        stream,
        staticData: JSON.parse(stream.connection.data),
        dynamicData: null
      };

      users.push(user);
      return state;
    });
  }

  async subscribe(user: User) {
    const subscriber = await this.session?.subscribeAsync(user.stream, undefined as any)!;
    subscriber.addVideoElement(this.videoElement!);
    //this.updateCanvasVideoElement(this.videoElement!);
    await this.startRecording(subscriber.stream);
    this.setState(state => ({ ...state, subscriber }));
    this.startAnimationFrame();
  }

  async unsubscribe() {
    if (this.isStreaming()) {
      await this.stopRecorder(true);
      this.stopAnimationFrame();
      this.session?.unsubscribe(this.state.subscriber!);
      this.setState(state => ({ ...state, subscriber: null, nav: 'users' }));
    }
  }

  async removeStream(stream: Stream) {
    const index = this.state.users.findIndex(el => el.stream.streamId === stream.streamId);
    this.state.users.splice(index, 1);

    if (this.state.subscriber?.stream.streamId === stream.streamId) {
      await this.unsubscribe();
    } else {
      this.setState(state => state);
    }
  }

  sendSignal(connection: Connection, type: SignalType) {
    this.session?.signal({ to: [connection], type });
  }

  updateDynamicUserData(connection: Connection, data: UserDynamicData) {
    const user = this.state.users.find(user => (
      user.stream.connection.connectionId === connection.connectionId
    ));

    if (user) {
      user.dynamicData = data;
      this.setState(state => state);
    }
  }

  async connect() {
    this.OV = new OpenVidu();
    this.session = this.OV.initSession();
    this.session.on('streamCreated', (event: any) => this.addStream(event.stream));
    this.session.on('streamDestroyed', (event: any) => this.removeStream(event.stream));
    this.session.on(`signal:${SignalType.PUSH_STATUS}`, (event: any) => (
      this.updateDynamicUserData(event.from, JSON.parse(event.data))
    ));

    try {
      const token = await getToken(this.serverAddress, this.sessionName);
      await this.session.connect(token);
    } catch (error) {
      console.log('can\'t start the session');
      console.log(error);
      this.openSnackBar('Server is not available');
    }
  }

  async disconnect() {
    if (this.session) {
      await this.unsubscribe();
      this.session.disconnect();
      this.session = undefined;
      this.OV = undefined;
    }
  }

  async onStreamSelected(user: User) {
    if (user.stream.streamId !== this.state.subscriber?.stream.streamId) {
      await this.unsubscribe();
      await this.subscribe(user);
    }
  }

  isStreaming(): boolean {
    return this.state.subscriber !== null;
  }

  playbackActive(): boolean {
    return this.state.preview !== false;
  }

  onFlipClicked(type: SignalType) {
    return () => {
      const connection = this.state.subscriber?.stream.connection;
      this.sendSignal(connection!, type);
    };
  }

  async startRecording(stream: Stream) {
    this.recorder = new LocalRecorder(stream);
    await this.recorder?.record();
  }

  saveVideo() {
    if (this.playbackActive()) {
      const blob = this.recorder!.fetchBlob();
      const a = document.createElement('a');
      a.style.display = 'none';
      document.body.appendChild(a);
      const url = window.URL.createObjectURL(blob);
      a.href = url;
      a.download = `recording-${Date.now()}.webm`;
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  }

  async togglePreview() {
    if (this.playbackActive()) {
      await this.stopPreview();
    } else {
      await this.startPreview();
    }
  }

  async startPreview() {
    //await this.recorder!.pause();
    this.stopAnimationFrame();
    const blob = this.recorder!.fetchBlob();
    this.state.subscriber?.removeAllVideos();
    this.state.subscriber?.addVideoElement(this.dummyVideoElement!);
    //await this.recorder!.resume();

    this.videoElement!.srcObject = null;
    this.videoElement!.src = window.URL.createObjectURL(blob);
    this.videoElement!.autoplay = false;
    this.videoElement!.currentTime = 1_000_000;

    this.setState(state => (
      { ...state, preview: true }
    ));
    this.drawFrame();
  }

  async stopPreview() {
    if (this.playbackActive()) {
      setTimeout(() => this.updateCanvasFilter(), 100);
      window.URL.revokeObjectURL(this.videoElement!.src);
      this.videoElement!.src = '';
      //await this.recorder!.pause();
      this.state.subscriber?.removeAllVideos();
      this.state.subscriber?.addVideoElement(this.videoElement!);
      this.startAnimationFrame();
      //await this.recorder!.resume();
      this.setState(state => ({ ...state, preview: false }));
    }
  }

  async stopRecorder(withClean: boolean) {
    if (this.recorder && this.recorder.state === LocalRecorderState.RECORDING) {
      await this.recorder.stop();
    }

    const result = this.recorder?.getBlob();

    if (withClean) {
      this.recorder?.clean();
      this.recorder = undefined;
    }

    return result;
  }

  recordingClicked() {
    if (this.recorder) this.startPreview();
    else this.startRecording(this.state.subscriber?.stream!);
  }

  openSnackBar(message: string) {
    this.setState(state => (
      { ...state, snackbar: { open: true, message }}
    ));
  }

  closeSnackBar() {
    this.setState(state => (
      { ...state, snackbar: { open: false }}
    ));
  }

  navClicked(_event: any, nav: NavigationValue) {
    if (nav == 'settings' && !(this.isStreaming() || this.playbackActive())) return;
    this.setState(state => ({ ...state, nav }));
  }

  getUserIndexForSubscriber() {
    return this.state.users.findIndex(user => (
      this.state.subscriber?.stream.streamId === user.stream.streamId
    ));
  }

  onVideoSettingsChange(mutator: (value: any) => any) {
    return (value: any) => {
      this.session?.signal({
        data: JSON.stringify(mutator(value)),
        to: [this.state.subscriber?.stream.connection!],
        type: SignalType.UPDATE_CAMERA
      });
    };
  }

  updateCanvasFilter() {
    const { brightness, contrast, grayscale } = this.canvasSettings;
    this.canvasContext!.filter = `brightness(${brightness}%) contrast(${contrast}%) grayscale(${grayscale}%)`;
  }

  onCanvasSettingsChange(mutator: (value: any) => any) {
    return (value: any) => {
      mutator(value);
      //this.updateCanvasFilter();
      if (this.playbackActive()) {
        this.drawFrame();
      }
    };
  }

  selectFrame(k: number) {
    if (!this.playbackActive()) return;
    const newTime = this.videoElement!.currentTime + FRAME_RATE_TIME * k;
    this.videoElement!.currentTime = Math.max(newTime, 0);
    this.drawFrame();
    this.setState(state => state);
  }

  sharpenImage(value: number) {
    sharpen(this.canvasContext!, this.canvas!.width, this.canvas!.height, value);
  }

  render() {
    const index = this.getUserIndexForSubscriber() ?? -1;
    const subscriber = this.isStreaming() ? this.state.users[index] : null;
    const currentDeviceIndex = subscriber?.staticData.videoDevices.findIndex(el => (
      subscriber?.dynamicData?.videoDeviceId === el.deviceId
    ));

    return (
      <Box className={this.props.classes.box}>
        <CssBaseline />
        <AppBar position='fixed' className={this.props.classes.bar}>
          <Toolbar variant='dense'>
            <IconButton color='inherit' edge='start' onClick={this.props.history.goBack}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h6" noWrap>
              {this.sessionName}
            </Typography>
          </Toolbar>
        </AppBar>
        <Drawer
          classes={{
            paper: this.props.classes.drawerComponent
          }}
          className={this.props.classes.drawer}
          variant='permanent'
          anchor='left'
          open
        >
          <Box className={this.props.classes.toolbar} />
          {
            this.state.nav === 'users'
              ? <UserList
                  users={this.state.users}
                  onUserSelected={this.onStreamSelected}
                  selected={index}
                />
              : <SettingsPage
                  isPreview={this.playbackActive()}
                  user={subscriber}
                  speed={this.state.speed}
                  currentSettings={{
                    videoDeviceIndex: currentDeviceIndex,
                    canvas: this.canvasSettings,
                    videoLength: this.playbackActive() ? this.videoElement!.duration : null,
                    videoPosition: this.playbackActive() ? this.videoElement!.currentTime : null
                  }}
                  settings={{
                    videoDeviceCount: subscriber?.staticData?.videoDevices?.length
                  }}
                  onVideoDeviceChange={this.onVideoSettingsChange((value: number) => {
                    const index = this.getUserIndexForSubscriber()!;
                    const deviceId = this.state.users[index].staticData.videoDevices[value].deviceId;
                    return { deviceId };
                  })}
                  onFocusChange={this.onVideoSettingsChange((focusDistance: number) => (
                    { advanced: [{ focusDistance }] }
                  ))}
                  onZoomChange={this.onVideoSettingsChange((zoom: number) => (
                    { advanced: [{ zoom }] }
                  ))}
                  onContrastChange={this.onCanvasSettingsChange((contrast: number) => (
                    this.canvasSettings.contrast = contrast
                  ))}
                  onBrightnessChange={this.onCanvasSettingsChange((brightness: number) => (
                    this.canvasSettings.brightness = brightness
                  ))}
                  onGrayScaleChange={this.onCanvasSettingsChange((grayscale: number) => (
                    this.canvasSettings.grayscale = grayscale
                  ))}
                  onSharpnessChange={this.onCanvasSettingsChange((value: number) => (
                    this.canvasSettings.sharpness = value
                  ))}
                  onVideoSeek={value => {
                    this.videoElement!.currentTime = value;
                    this.setState(state => state);
                  }}
                />
          }
          <BottomNavigation
            value={this.state.nav}
            onChange={this.navClicked}
            className={this.props.classes.nav}
          >
            <BottomNavigationAction value='users' icon={<ListIcon />} />
            <BottomNavigationAction value='settings' icon={<SettingsIcon />} />
          </BottomNavigation>
        </Drawer>
        <Snackbar
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          open={this.state.snackbar.open}
          onClose={this.closeSnackBar}
          message={this.state.snackbar.message}
          autoHideDuration={6000}
        />
        <Video
          hidden={!this.isStreaming() && !this.playbackActive()}
          subscriber={subscriber}
          isPreview={this.playbackActive()}
          onFlipSound={this.onFlipClicked(SignalType.FLIP_SOUND)}
          onStartRecording={this.recordingClicked}
          onVideoSave={this.saveVideo}
          onCallEnd={() => this.unsubscribe()}
          onBackFrame={() => this.selectFrame(-1)}
          onForwardFrame={() => this.selectFrame(1)}
          isRecording={this.recorder !== undefined}
        />
      </Box>
    );
  }
}

export default withStyles(styles)(withRouter(Home));
