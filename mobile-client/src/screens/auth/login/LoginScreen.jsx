import {
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";

import styles from "./login.styles";

export default function LoginScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.brand}>
                        WindChime
                    </Text>

                    <Text style={styles.title}>
                        Welcome back
                    </Text>

                    <Text style={styles.description}>
                        Sign in to continue your conversations.
                    </Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.field}>
                        <Text style={styles.label}>
                            Email
                        </Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Enter your email"
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>
                            Password
                        </Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Enter your password"
                            secureTextEntry
                        />
                    </View>

                    <Pressable style={styles.button}>
                        <Text style={styles.buttonText}>
                            Sign in
                        </Text>
                    </Pressable>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Don't have an account?{" "}
                    </Text>

                    <Link href="/register" style={styles.footerLink}>
                        Create account
                    </Link>
                </View>
            </View>
        </SafeAreaView>
    );
}