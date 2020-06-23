import React from 'react';
import User from '../model/User';
import { Table, TableBody, TableRow, TableCell, Select, MenuItem, Slider } from '@material-ui/core';

export type CanvasSettings = {
  brightness: number,
  contrast: number,
  grayscale: number,
  sharpness: number
};

type CurrentSettings = {
  videoDeviceIndex: number | undefined,
  canvas: CanvasSettings,
  videoLength: number | null,
  videoPosition: number | null
};

type Settings = {
  videoDeviceCount: number | undefined
};

type SliderCallback = (value: number) => void;

type SettingsPageProps = {
  user: User | null,
  currentSettings: CurrentSettings,
  settings: Settings,
  onVideoDeviceChange: SliderCallback,
  onFocusChange: SliderCallback,
  onZoomChange: SliderCallback,
  onContrastChange: SliderCallback,
  onBrightnessChange: SliderCallback,
  onGrayScaleChange: SliderCallback,
  onVideoSeek: SliderCallback,
  onSharpnessChange: SliderCallback,
  isPreview: boolean,
  speed: number
};

const capitalize = (s: string) => (
  s.charAt(0).toUpperCase() + s.slice(1)
);

const SettingsPage: React.FC<SettingsPageProps> = ({
  user,
  currentSettings,
  settings,
  onVideoDeviceChange,
  onFocusChange,
  onZoomChange,
  onContrastChange,
  onBrightnessChange,
  onGrayScaleChange,
  isPreview,
  onVideoSeek,
  onSharpnessChange,
  speed
}) => {
  const dynamicData: {
    [key: string]: any
  } = user?.dynamicData!;
  const battery = user!.dynamicData?.battery;

  return (<>
    <Table size='small'>
      <TableBody>
        <TableRow>
          <TableCell>Speed</TableCell>
          <TableCell>{`${Math.round(speed / 1024)} kB/s`}</TableCell>
        </TableRow>
        { isPreview ? <></>
            : Object.entries(user!.staticData.deviceInfo).map(([key, value]) => (
                <TableRow>
                  <TableCell>{capitalize(key)}</TableCell>
                  <TableCell>{value}</TableCell>
                </TableRow>
              ))
        }
        <TableRow>
          <TableCell>Battery</TableCell>
          <TableCell>
            {
              battery ? `${battery!.level}% ${battery!.isPlugged ? '(Charging)' : ''}` : 'N/A'
            }
          </TableCell>
        </TableRow>
        {
          isPreview ? <></>
            : <TableRow>
                <TableCell>Active camera</TableCell>
                <TableCell>
                  <Select
                    value={currentSettings.videoDeviceIndex!}
                    onChange={(e: any) => onVideoDeviceChange(e.target.value)}
                  >
                    {
                      [...Array(settings.videoDeviceCount!)].map((_, i) => (
                        <MenuItem value={i}>{i + 1}</MenuItem>
                      ))
                    }
                  </Select>
                </TableCell>
              </TableRow>
        }
        {
          isPreview ? <></>
            : [
                {key: 'focus', cb: onFocusChange},
                {key: 'zoom', cb: onZoomChange}
              ].map(({key, cb}) => (
                <TableRow>
                  <TableCell>{capitalize(key)}</TableCell>
                  <TableCell>
                    <Slider
                      disabled={!(key in dynamicData)}
                      min={dynamicData[key]?.min ?? 0}
                      max={dynamicData[key]?.max ?? 100}
                      step={dynamicData[key]?.step ?? 1}
                      onChangeCommitted={(_, val: any) => cb(val)}
                    />
                  </TableCell>
                </TableRow>
              ))
        }
        <TableRow>
          <TableCell>Brightness</TableCell>
          <TableCell>
            <Slider
              min={0}
              max={200}
              step={1}
              defaultValue={currentSettings?.canvas?.brightness ?? 0}
              onChangeCommitted={(_, val: any) => onBrightnessChange(val)}
            />
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Contrast</TableCell>
          <TableCell>
            <Slider
              min={0}
              max={200}
              step={1}
              defaultValue={currentSettings?.canvas?.contrast ?? 0}
              onChangeCommitted={(_, val: any) => onContrastChange(val)}
            />
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Grayscale</TableCell>
          <TableCell>
            <Slider
              min={0}
              max={100}
              step={1}
              defaultValue={currentSettings?.canvas?.grayscale ?? 0}
              onChangeCommitted={(_, val: any) => onGrayScaleChange(val)}
            />
          </TableCell>
        </TableRow>
        {<TableRow>
          <TableCell>Sharpness</TableCell>
          <TableCell>
            <Slider
              min={0}
              max={200}
              step={1}
              defaultValue={currentSettings?.canvas?.sharpness ?? 0}
              onChangeCommitted={(_, val: any) => onSharpnessChange(val)}
            />
          </TableCell>
        </TableRow>}
        {
          /*isPreview
            ? <TableRow>
                <TableCell>
                  <Slider
                    min={0}
                    max={currentSettings.videoLength!}
                    step={1 / 30}
                    defaultValue={currentSettings.videoPosition ?? 0}
                    onChangeCommitted={(_, val: any) => onVideoSeek(val)}
                  />
                </TableCell>
              </TableRow>
            : <></>*/
        }
      </TableBody>
    </Table>
  </>);
};

export default SettingsPage;
