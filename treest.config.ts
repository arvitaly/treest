export default {
    setup: async () => {
        //
    },
    mocks: {
        fs: () => {
            return {
                readFileSync: (name: string) => {
                    if (name === "./dot.txt") {
                        return ".";
                    }
                    return ",";
                },
            };
        },
    },
};
