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
                <Grommet.Paragraph margin="none">
                    Follow the steps in <Grommet.Anchor target="_blank" href={url} label="this page" />.
                    Once authentication is successfull, paste the URL in your browser in the field below.
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
                    <Grommet.TextInput type="url" id="url" name="url" placeholder="Paste browser URL acquired through link"
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
                        // value={pin}
                        icon={<GrommetIcons.Key />}
                    // onChange={({ target: { value } }) => setPin(value ?? "")}
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