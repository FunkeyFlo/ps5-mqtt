import * as Grommet from 'grommet';
import * as GrommetIcons from 'grommet-icons';
import React from 'react';
import { Authenticate } from './authenticate';
import { AppContext } from './context';
import type { IDevice } from './types';

export const Device: React.FC<{ device: IDevice }> = ({ device }) => {
    const { api } = React.useContext(AppContext);
    const [authUrl, setAuthUrl] = React.useState<string>("");

    const onAuthExit = async () => {
        setAuthUrl(undefined);
    }

    return (
        <>
            <Grommet.Card animation={[
                { type: 'zoomIn', duration: 500, size: 'large' },
                { type: 'fadeIn', duration: 500, size: 'large' },
            ]}>
                <Grommet.CardHeader pad="medium">
                    <Grommet.Heading level="2" margin={{ vertical: 'none' }}>{device.name}</Grommet.Heading>
                </Grommet.CardHeader>
                <Grommet.CardBody pad={{ bottom: "medium" }} height="large">
                    <Grommet.DataTable columns={[
                        { property: 'key', primary: true, header: "Property" },
                        { property: 'value', header: "Value" }
                    ]} data={Object.keys(device).filter(k => k !== 'extras').sort().map(key => ({
                        key,
                        value: typeof device[key] === 'object' ? JSON.stringify(device[key]) : device[key]
                    }))} step={10} />
                </Grommet.CardBody>
                <Grommet.CardFooter pad={{ horizontal: "small" }}>
                    <Grommet.Button icon={<GrommetIcons.Connect size="medium" />}
                        onClick={async () => {
                            const url = await api.acquireAuthenticationLink(device);
                            if (url !== undefined) {
                                setAuthUrl(url);
                            }
                        }}
                        hoverIndicator
                        tip={"Authenticate"}
                    />
                </Grommet.CardFooter>
            </Grommet.Card>

            {!!authUrl && (
                <Grommet.Layer
                    onEsc={onAuthExit}
                    onClickOutside={onAuthExit}
                >
                    <Authenticate url={authUrl} onDone={onAuthExit} device={device} />
                </Grommet.Layer>
            )}
        </>
    );
}