import { grommet, ThemeType } from "grommet";
import { deepMerge } from "grommet/utils";

const theme = deepMerge(grommet, <ThemeType>{
    global: {
        colors: {
            active: "light-5",
            "light-1": {
                dark: grommet.global.colors["dark-1"],
                light: grommet.global.colors["light-1"],
            },
            "dark-extra": "#1a1a1a",
            "dark-0": "#2a2a2a"
        },
        font: {
            size: "16px",
            height: "20px"
        },
        input: {
            weight: 100
        },
        size: {
            avatar: "36px",
            sidebar: "60px"
        },
        elevation: {
            dark: {
                small: "0px 2px 2px #1a1a1a"
            }
        },
    },
    icon: {
        size: {
            medium: "18px"
        }
    },
    paragraph: {
        medium: {
            size: "16px",
            height: "20px"
        },
        large: {
            size: "20px",
            height: "24px"
        }
    },
    card: {
        header: {
            background: {
                color: {
                    dark: "dark-0",
                    light: "light-1"
                }
            }
        },
        footer: {
            background: {
                color: {
                    dark: "dark-0",
                    light: "light-1"
                }
            }
        }
    },
    layer: {
        background: {
            dark: "dark-1"
        },
    },
});

export default theme;