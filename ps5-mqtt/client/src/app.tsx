import * as Grommet from 'grommet';
import * as GrommetIcons from 'grommet-icons';
import React from 'react';
import Api from './api';
import { AppContext } from './context';
import { Devices } from './devices';
import theme from './theme';
import type { IMessage } from './types';

type ThemeMode = 'dark' | 'light'

function getOsThemePreference(): ThemeMode {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const App = () => {
    const [message, setMessage] = React.useState<IMessage | undefined>(undefined);
    const [themeMode, setThemeMode] = React.useState<ThemeMode>(getOsThemePreference());

    const toggleTheme = () => {
        setThemeMode(themeMode === 'dark' ? 'light' : 'dark');
    };

    return (
        <AppContext.Provider value={{
            api: new Api({
                log: (value) => {
                    setMessage({ type: 'info', value: value?.toString() })
                },
                error: (value) => {
                    setMessage({ type: 'error', value: value?.toString() })
                },
            })
        }}>
            <Grommet.Grommet theme={theme} full={true}
                themeMode={themeMode} background={themeMode === 'dark' ? 'dark-1' : 'light'}
            >
                <Grommet.Header pad="small" background={"dark-extra"}>
                    <Grommet.Anchor
                        href="https://github.com/FunkeyFlo/ps5-mqtt/"
                        icon={<GrommetIcons.Github />}
                        target="_blank"
                        label="PS5-MQTT"
                    />
                    {/* <Grommet.Avatar src={gravatarLink} /> */}
                    <Grommet.Nav direction="row">
                        <Grommet.Button
                            icon={themeMode === 'dark' ? <GrommetIcons.Sun /> : <GrommetIcons.Moon />} 
                            onClick={toggleTheme}
                        />
                    </Grommet.Nav>
                </Grommet.Header>

                <Devices />
                {!!message && (
                    <Grommet.Notification message={message?.value} toast title={message.type.toUpperCase()} status={message.type === 'error' ? 'critical' : 'info'} />
                )}
            </Grommet.Grommet>
        </AppContext.Provider>
    );
}

const RoundSpinner = ({ url, delay }: { url: string, delay?: number }) => (
    <Grommet.Spinner
        animation={{ type: 'pulse', duration: 1200, size: 'large', delay: delay ?? 0 }}
        justify="center"
        size='medium'
    >
        <img src={url} />
    </Grommet.Spinner>
);

export const Loader = () => {
    const baseDelay = 300;

    return (
        <Grommet.Box align="center" direction="row" gap="medium" pad="large">
            <RoundSpinner url="img/PlayStationCross.svg" />
            <RoundSpinner url="img/PlayStationCircle.svg" delay={baseDelay * 1} />
            <RoundSpinner url="img/PlayStationTriangle.svg" delay={baseDelay * 2} />
            <RoundSpinner url="img/PlayStationSquare.svg" delay={baseDelay * 3} />
        </Grommet.Box>
    )
};

export default App;