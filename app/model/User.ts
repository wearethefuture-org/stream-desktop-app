import { Stream, Device } from "openvidu-browser";

export type UserStaticData = {
  deviceInfo: {
    name: string,
    model: string,
    manufacturer: string,
    serial: string
  },
  videoDevices: Device[]
};

type NumberRange = {
  min: number,
  max: number,
  step: number
};

export type BatteryStatus = {
  level: number,
  isPlugged: boolean
};

export type UserDynamicData = {
  withAudio: boolean,
  videoDeviceId: string,
  zoom?: NumberRange,
  focus?: NumberRange,
  contrast?: NumberRange,
  brightness?: NumberRange,
  battery?: BatteryStatus
};

type User = {
  staticData: UserStaticData,
  stream: Stream,
  dynamicData: UserDynamicData | null
}

export default User;
