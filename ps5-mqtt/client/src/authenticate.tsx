import React from "react";
import * as Grommet from 'grommet';
import * as GrommetIcons from 'grommet-icons';
import type { IDevice } from "./types";
import { AppContext } from "./context";

export const Authenticate: React.FC<{
    device: IDevice,
    url: string,
    onDone: (success?: boolean) => Promise<void>;
}> = ({ device, onDone, url }) => {
    const { api } = React.useContext(AppContext)
    const [authenticating, setAuthenticating] = React.useState<boolean>(false);
    const [valid, setValid] = React.useState(false);

    return (
        <Grommet.Box pad="small" gap='medium' width='medium'>
            <Grommet.Heading level="3" margin='none'>
                Authenticate with {device.name}
            </Grommet.Heading>

            <Grommet.Form
                validate='change'
                onSubmit={async (event) => {
                    const { pin, url } = event.value as { pin: string, url: string };
                    setAuthenticating(true);
                    await api.connectToDevice(device, pin, url);
                    onDone();
                }}
                onValidate={(validationResults) => {
                    setValid(validationResults.valid);
                }}
            >
                <ol style={{ margin: 0, paddingLeft: 17 + 'px' }}>
                    <li>Authenticate with PSN by following the steps in <Grommet.Anchor target="_blank" href={url} label="this page" />.</li>
                    <li>Once successfull authentication the page will read <i>redirect</i>, <b>this is OK!</b></li>
                    <li>Copy the URL of the <b>redirect</b> page from your browser and paste in the field below.</li>
                </ol>

                <Grommet.Paragraph>
                    Having trouble? <Grommet.Anchor target="_blank"
                        href="https://community.home-assistant.io/t/ps5-mqtt-control-playstation-5-devices-using-mqtt/441141#authentication-ui-v060-3"
                        label="Watch this video"
                    />.
                </Grommet.Paragraph>

                <Grommet.FormField label="URL" name="url"
                    htmlFor="url" required disabled={authenticating}
                    validate={[
                        (value) => {
                            try {
                                const parsedUrl = new URL(value);
                                if (parsedUrl.protocol !== 'https:')
                                    return 'must be a valid url';
                                return undefined;
                            } catch (e) {
                                console.error(e);
                                return 'must be a valid url';
                            }
                        },
                    ]}>
                    <Grommet.TextInput type="url" id="url" name="url"
                        placeholder="Paste browser URL acquired through link"
                        icon={<GrommetIcons.Link />}
                    />
                </Grommet.FormField>

                <Grommet.Paragraph margin="none">
                    On your PlayStation 5, go to Settings &gt; System &gt; Remote Play &gt; Link Device.
                    Enter the PIN Code below.
                </Grommet.Paragraph>

                <Grommet.FormField label="PIN Code" name="pin" required
                    htmlFor="pin" disabled={authenticating}
                    validate={[
                        { regexp: /^[0-9]/i },
                        (value) => {
                            if (value?.length !== 8)
                                return 'must be exactly 8 digits';
                            return undefined;
                        },
                    ]}>
                    <Grommet.TextInput
                        name="pin"
                        id="pin"
                        placeholder="Remote Play PIN Code"
                        icon={<GrommetIcons.Key />}
                    />
                </Grommet.FormField>

                <Grommet.Box direction="row" justify="between" margin={{ top: 'medium' }}>
                    <Grommet.Button label="Cancel" onClick={() => onDone()} />
                    <Grommet.Button type="submit" label={"Authenticate"} primary
                        disabled={!valid || authenticating} icon={authenticating ? <Grommet.Spinner /> : null}
                    />
                </Grommet.Box>
            </Grommet.Form>
        </Grommet.Box>
    );
}