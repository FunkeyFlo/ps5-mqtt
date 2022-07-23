import * as Grommet from 'grommet';
import React from 'react';
import Api from './api';
import { AppContext } from './context';
import { Devices } from './devices';
import type { IMessage } from './types';

export const App = () => {
    const [ message, setMessage ] = React.useState<IMessage | undefined>(undefined);

    return (
        <AppContext.Provider value={{api: new Api({
            log: (value) => {
                setMessage({ type: 'info', value: value?.toString()})
            }, 
            error: (value) => {
                setMessage({type: 'error', value: value?.toString()})
            },
        })}}>
            <Devices />

            {!!message && (
                <Grommet.Notification message={message?.value} toast title={message.type.toUpperCase()} status={message.type ==='error' ? 'critical' : 'info'} />
            )}
        </AppContext.Provider>
    );
}

const RoundSpinner = ({ url, delay }: {url:string, delay?: number}) => (
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
            <RoundSpinner url="/img/PlayStationCross.svg" />
            <RoundSpinner url="/img/PlayStationCircle.svg" delay={baseDelay * 1} />
            <RoundSpinner url="/img/PlayStationTriangle.svg" delay={baseDelay * 2} />
            <RoundSpinner url="/img/PlayStationSquare.svg" delay={baseDelay * 3} />
        </Grommet.Box>
    )
};

export default App;