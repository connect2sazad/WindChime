import { StyleSheet } from "react-native";

import colors from "./colors";
import spacing from "./spacing";
import typography from "./typography";

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.background,
        padding: spacing.md,
    },

    title: {
        color: colors.text,
        fontSize: typography.sizes.xxl,
        fontWeight: typography.weights.bold,
    },

    subtitle: {
        marginTop: spacing.sm,
        color: colors.textSecondary,
        fontSize: typography.sizes.md,
    },
});

export default styles;