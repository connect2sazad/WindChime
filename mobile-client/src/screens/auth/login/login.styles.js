import { StyleSheet } from "react-native";

import colors from "../../../styles/colors";
import spacing from "../../../styles/spacing";
import typography from "../../../styles/typography";

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },

    content: {
        flex: 1,
        justifyContent: "center",
        paddingHorizontal: spacing.lg,
    },

    header: {
        marginBottom: spacing.xl,
    },

    brand: {
        marginBottom: spacing.xl,
        color: colors.text,
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.bold,
    },

    title: {
        color: colors.text,
        fontSize: typography.sizes.xxl,
        fontWeight: typography.weights.bold,
    },

    description: {
        marginTop: spacing.sm,
        color: colors.textSecondary,
        fontSize: typography.sizes.md,
        lineHeight: 24,
    },

    form: {
        gap: spacing.md,
    },

    field: {
        gap: spacing.sm,
    },

    label: {
        color: colors.text,
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.medium,
    },

    input: {
        height: 52,
        paddingHorizontal: spacing.md,

        color: colors.text,
        backgroundColor: colors.background,

        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,

        fontSize: typography.sizes.md,
    },

    button: {
        height: 52,
        alignItems: "center",
        justifyContent: "center",

        marginTop: spacing.sm,

        backgroundColor: colors.primary,
        borderRadius: 12,
    },

    buttonText: {
        color: colors.white,
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.semibold,
    },

    footer: {
        flexDirection: "row",
        justifyContent: "center",

        marginTop: spacing.xl,
    },

    footerText: {
        color: colors.textSecondary,
        fontSize: typography.sizes.sm,
    },

    footerLink: {
        color: colors.text,
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.semibold,
    },
});

export default styles;