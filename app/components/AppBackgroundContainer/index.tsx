import React, { memo, ReactNode } from 'react';
import styled from '../../styles/styled-components';
import media from '../../styles/media';
import AppHeader from 'components/AppHeader';
import { BackgroundPattern } from './BackgroundPattern';
import AppFooter from 'components/AppFooter';
import { hideScrollBar } from 'styles/mixins';

interface Props {
  children?: ReactNode;
  hideFooter?: boolean;
  showBackButton?: boolean;
  replaceHeaderWith?: ReactNode;
}

function AppBackgroundContainer(props: Props) {
  return (
    <React.Fragment>
      <BackgroundImage />
      <Wrapper>
        {props.replaceHeaderWith ? (
          props.replaceHeaderWith
        ) : (
          <AppHeader showBackButton={props.showBackButton} />
        )}
        <ContentSection>{props.children}</ContentSection>
        {!props.hideFooter && <AppFooter />}
      </Wrapper>
    </React.Fragment>
  );
}

const ContentSection = styled.div`
  display: flex;
  flex-direction: column;
  padding: 1rem;
  align-items: center;
  flex: 1;
  overflow-y: scroll;
  overflow-x: visible;
  ${hideScrollBar};
  ${media.desktop`
    align-items: flex-start;
    padding: 2rem 2rem 0rem 3em;
  `};
`;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  /* justify-content: space-between; */
  ${media.desktop`
    flex-direction: row;
    min-height: auto;
    max-height: 100vh;
  `}
`;

const BackgroundImage = styled(BackgroundPattern)`
  position: fixed;
  right: 0;
  bottom: 0;
  width: 100%;
  z-index: -999;
  ${media.desktop`
    width: auto;
  `}
`;
export default memo(AppBackgroundContainer);
