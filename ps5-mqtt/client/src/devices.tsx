import * as Grommet from "grommet";
import React from "react";
import { Loader } from "./app";
import { AppContext } from "./context";
import { Device } from "./device";
import type { IDevice } from "./types";

export const Devices: React.FC = () => {
    const { api } = React.useContext(AppContext);
    const [ devices, setDevices ] = React.useState<IDevice[] | undefined>();
    const [ isDiscovering, setIsDiscovering ] = React.useState<boolean>(false);

    React.useEffect(() => {
        setIsDiscovering(false);
    }, [devices]);

    React.useEffect(() => {
        setIsDiscovering(true);
        api.getDevices().then(d => setDevices(d));
    }, []);

    return (
            <Grommet.Box fill background="light-1" align='center' gap="medium" pad="medium">
                <Grommet.Heading level="1" margin="none" size="small">
                    PS5 MQTT
                </Grommet.Heading>

                <Grommet.Box align="start" pad="large" gap="large">
                    {
                        isDiscovering 
                            ? <Loader /> 
                            : (
                                <Grommet.Button size="large" primary disabled={isDiscovering} onClick={async () => {
                                    setIsDiscovering(true);
                                    const devices = await api.getDevices();
                                    setDevices(devices);
                                }} label="Refresh" />
                            )
                    }
                </Grommet.Box>
                
                {!isDiscovering && devices?.map(d => (
                    <Device device={d} key={d.id} />
                ))}
            </Grommet.Box>
    );
}