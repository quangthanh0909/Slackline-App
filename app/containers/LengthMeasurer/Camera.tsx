import React, { memo, useContext, useState, useEffect } from 'react';
import styled, { ThemeContext } from 'styles/styled-components';
import media from 'styles/media';
import Webcam from 'react-webcam';
import { useDeviceOrientation } from 'utils/hooks/useDeviceOrientation';
import { elevatedShadow, touchableOpacity } from 'styles/mixins';
import CancelIcon from 'components/svg/cancel.svg';
import { cover, mix } from 'polished';
import { Button } from 'components/Button';
import { Spinner } from 'components/LoadingIndicator';
import { Utils } from 'utils/index';
import Portal from 'components/Modal';
import { RotateDeviceModal } from '../../components/RotateDeviceModal';
import CrosshairIcon from './crosshair.svg';

interface Props {
  closeClicked(): void;
  knownDistance: number;
}

enum MeasuringState {
  started = 0,
  farAnchorMarked = 1,
  closeAnchorMarked = 2,
}

let farAnchorAlpha = 0;
let closeAnchorAlpha = 0;

function Component(props: Props) {
  const [orientation, screenOrientation] = useDeviceOrientation();
  const [measuringState, setMeasuringState] = useState(MeasuringState.started);
  const [cameraError, setCameraError] = useState<string>();

  const webcamRef = React.useRef<Webcam>(null);
  const sliderRef = React.useRef<HTMLInputElement>(null);

  const [zoomValue, setZoomValue] = useState(0);
  useEffect(() => {
    if (webcamRef) {
      enableZoom();
    }
  }, [webcamRef, sliderRef]);

  let currentAlpha = 0;
  let tiltAngle = 0;

  if (orientation) {
    if (
      screenOrientation === 'landscape' &&
      orientation.alpha &&
      orientation.gamma &&
      orientation.beta
    ) {
      currentAlpha = orientation.alpha;
      if (orientation.gamma > 0) {
        currentAlpha = (180 + orientation.alpha) % 360;
        orientation.beta < 0
          ? (tiltAngle = -(180 + orientation.beta))
          : (tiltAngle = 180 - orientation.beta);
      } else {
        tiltAngle = orientation.beta;
      }
    }
  }

  const videoConstraints = {
    facingMode: 'environment',
  };
  function enableZoom() {
    setTimeout(() => {
      if (webcamRef.current?.stream) {
        const track = webcamRef.current.stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities() as any;
        const settings = track.getSettings() as any;

        // Check whether zoom is supported or not.
        if (!('zoom' in capabilities)) {
          console.log('Zoom is not supported by ' + track.label);
          return;
        }
        const slider = sliderRef.current;
        if (slider) {
          slider.min = capabilities.zoom?.min;
          slider.max = capabilities.zoom?.max;
          slider.step = capabilities.zoom?.step;
          slider.value = settings.zoom;
          slider.hidden = false;
          setZoomValue(settings.zoom);
          slider.onchange = slider.oninput = (event: any) => {
            if (event?.target?.value) {
              setZoomValue(event.target.value);
              track.applyConstraints({
                advanced: [{ zoom: event.target.value } as any],
              });
            }
          };
        }
      }
    }, 1000);
  }

  const sliderOnChange = e => {
    // setZoomValue(e.target.value);
  };

  function webcamError(error: string) {
    alert('Cannot access to the camera: ' + error);
    setCameraError(error);
  }


  function farAnchorAngle() {
    if (farAnchorAlpha && currentAlpha) {
      return Utils.angleDiff(farAnchorAlpha, currentAlpha);
    }
    return undefined;
  }
  function knownDistanceAngle() {
    if (closeAnchorAlpha && currentAlpha) {
      return Utils.angleDiff(closeAnchorAlpha, currentAlpha);
    }
    return undefined;
  }

  function distance() {
    const angleC = farAnchorAngle();
    const angleA = knownDistanceAngle();
    const lengthC = props.knownDistance;
    if (angleA && angleC && lengthC) {
      const distance =
        (lengthC * Math.sin(Utils.degreesToRadians(angleA))) /
        Math.sin(Utils.degreesToRadians(angleC));
      return Utils.trimToDecimals(distance, 1);
    }
    return undefined;
  }

  function accuracyIndicator() {
    const angle = farAnchorAngle();
    let text = '';
    let color = '';

    if (angle) {
      if (angle > 0) {
        text = 'Very low';
        color = '#951212';
      }
      if (angle > 4) {
        text = 'Low';
        color = 'red';
      }
      if (angle > 6) {
        text = 'Moderate';
        color = '';
      }
      if (angle > 8) {
        text = 'High';
        color = 'green';
      }
      if (angle > 12) {
        text = 'Very High';
        color = 'green';
      }
    }
    return { text, color };
  }

  function buttonClicked() {
    if (measuringState === MeasuringState.started) {
      farAnchorAlpha = currentAlpha;
      setMeasuringState(MeasuringState.farAnchorMarked);
    } else if (measuringState === MeasuringState.farAnchorMarked) {
      closeAnchorAlpha = currentAlpha;
      setMeasuringState(MeasuringState.closeAnchorMarked);
    } else if (measuringState === MeasuringState.closeAnchorMarked) {
      farAnchorAlpha = 0;
      closeAnchorAlpha = 0;
      setMeasuringState(MeasuringState.started);
    }
  }

  return (
    <Wrapper>
      <LoadingText>
        Loading Camera
        <Loading />
      </LoadingText>
      <StyledCamera
        audio={false}
        screenshotFormat="image/jpeg"
        videoConstraints={videoConstraints}
        ref={webcamRef}
        onUserMedia={enableZoom}
        onUserMediaError={webcamError}

      />

      <CloseButton onClick={props.closeClicked} />
      {screenOrientation === 'landscape' ? (
        <React.Fragment>
          <Crosshair />
          <CenterWrapper>
            {
              {
                0: (
                  <Text>
                    FAR ANCHOR
                    <span>(Stand on the anchor and mark the far anchor)</span>
                  </Text>
                ),
                1: (
                  <Text>
                    CLOSE ANCHOR
                    <span>
                      (Stand on the measured spot and mark the close anchor)
                    </span>
                  </Text>
                ),
                2:
                  !Utils.isNil(distance()) && distance()! >= 0 ? (
                    <DistanceWrapper>
                      <DistanceText>
                        <span>{distance()}</span>m
                      </DistanceText>
                      <AccuracyText color={accuracyIndicator().color}>
                        Accuracy: <span>{accuracyIndicator().text}</span>
                      </AccuracyText>
                    </DistanceWrapper>
                  ) : (
                    <Text>️Invalid distance ⚠️</Text>
                  ),
              }[measuringState]
            }

            {
              {
                0: (
                  <CustomButton onClick={buttonClicked}>
                    Mark Far Anchor
                  </CustomButton>
                ),
                1: (
                  <CustomButton
                    key="keyforrenderingagain"
                    onClick={buttonClicked}
                  >
                    Mark Close Anchor
                  </CustomButton>
                ),
                2: (
                  <CustomButton
                    key="keyforrenderingagain2"
                    onClick={buttonClicked}
                  >
                    Measure Again
                  </CustomButton>
                ),
              }[measuringState]
            }
          </CenterWrapper>
        </React.Fragment>
      ) : (
        <Portal isTransparentBackground={true} allowEvents={true} z={999}>
          <RotateDeviceModal />
        </Portal>
      )}
      <ZoomSlider
        ref={sliderRef}
        onChange={sliderOnChange}
        onInput={sliderOnChange}
        value={zoomValue}
        hidden={true}
        style={{
          visibility: screenOrientation === 'landscape' ? 'unset' : 'hidden',
        }}
      />
    </Wrapper>
  );
}

const ZoomSlider = styled.input.attrs({ type: 'range' })`
  position: absolute;
  margin: auto;
  right: -2rem;
  -webkit-appearance: none;
  width: 50vh;
  height: 4px;
  border-radius: 10px;
  background: ${props => props.theme.text};
  outline: none;
  transform-origin: center;
  transform: rotate(-90deg);
  pointer-events: visible;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: ${props => props.theme.text};
    cursor: pointer;
  }
  &::-moz-range-thumb {
    width: 13px;
    height: 13px;
    border-radius: 50%;
    background: white;
    cursor: pointer;
  }
`;

const Crosshair = styled.img.attrs({
  src: CrosshairIcon,
})`
  display: flex;
  position: absolute;
  margin: auto;
  width: 3rem;
  height: 3rem;
`;

const DistanceWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const CenterWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  height: 100%;
  margin-top: auto;
  justify-content: space-evenly;
`;

const CustomButton = styled(Button)`
  /* margin-bottom: 1rem; */
  font-size: 0.8rem;
  border-radius: 2rem;
`;

const AccuracyText = styled.span<{ color: string }>`
  /* display: flex; */
  text-align: center;
  font-size: 0.6rem;
  & span {
    font-weight: bold;
    margin-left: 0.2rem;
    font-size: 0.6rem;
    color: ${props => props.color};
  }
`;

const DistanceText = styled.span`
  /* display: flex; */
  text-align: center;
  font-size: 0.8rem;
  & span {
    font-weight: bold;
    margin-right: 0.5rem;
    font-size: 2rem;
  }
`;

const Text = styled.span`
  display: flex;
  /* margin-top: 2.5rem; */
  font-weight: bold;
  font-size: 1.2rem;
  text-align: center;
  flex-direction: column;
  align-items: center;
  & span {
    font-weight: normal;
    color: ${props => props.theme.textSecondary};
    margin-top: 0.5rem;
    font-size: 0.8rem;
  }
`;

const StyledCamera = styled(Webcam)<{ ref?: any }>`
  position: absolute;
  top: 50%;
  left: 50%;
  -webkit-transform: translateX(-50%) translateY(-50%);
  transform: translateX(-50%) translateY(-50%);
  width: 100%;
  min-height: 100%;
  width: auto;
  height: auto;
  z-index: -1;
  overflow: hidden;
`;

const CloseButton = styled.img.attrs({ src: CancelIcon })`
  position: absolute;
  right: 1rem;
  top: 1rem;
  width: 1.2rem;
  ${touchableOpacity}
`;

const Loading = styled(Spinner)`
  width: 2rem;
  height: 2rem;
  margin-top: 1rem;
`;

const LoadingText = styled.span`
  display: flex;
  flex-direction: column;
  align-items: center;
  position: absolute;
  word-break: keep-all;
  line-break: strict;
  left: 25%;
  right: 25%;
  top: 2rem;
  font-size: 1.2rem;
  font-weight: bold;
  text-align: center;
  z-index: -1;
`;

const Wrapper = styled.div`
  ${cover()}
  position: fixed;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: ${props => props.theme.surface};
  z-index: 2;
`;

export const Camera = memo(Component);
