import SwiftUI

struct RegisterView: View {
    @EnvironmentObject var authVM: AuthViewModel
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var showPassword = false
    @FocusState private var focused: Field?

    enum Field { case firstName, lastName, email, password, confirm }

    private var passwordMismatch: Bool { !confirmPassword.isEmpty && confirmPassword != password }
    private var canSubmit: Bool {
        !firstName.isEmpty && !lastName.isEmpty && !email.isEmpty
        && password.count >= 8 && confirmPassword == password && !authVM.isLoading
    }

    var body: some View {
        VStack(spacing: 20) {
            if let err = authVM.errorMessage {
                ErrorBanner(message: err)
            }

            VStack(spacing: 14) {
                HStack(spacing: 10) {
                    BrevTextField(placeholder: "Prénom", text: $firstName, icon: "person")
                        .focused($focused, equals: .firstName)
                        .submitLabel(.next)
                        .onSubmit { focused = .lastName }

                    BrevTextField(placeholder: "Nom", text: $lastName, icon: nil)
                        .focused($focused, equals: .lastName)
                        .submitLabel(.next)
                        .onSubmit { focused = .email }
                }

                BrevTextField(
                    placeholder: "Email",
                    text: $email,
                    icon: "envelope",
                    keyboardType: .emailAddress,
                    textContentType: .emailAddress
                )
                .focused($focused, equals: .email)
                .submitLabel(.next)
                .onSubmit { focused = .password }

                BrevSecureField(placeholder: "Mot de passe (8 car. min.)", text: $password, showPassword: $showPassword)
                    .focused($focused, equals: .password)
                    .submitLabel(.next)
                    .onSubmit { focused = .confirm }

                BrevSecureField(placeholder: "Confirmer le mot de passe", text: $confirmPassword, showPassword: $showPassword)
                    .focused($focused, equals: .confirm)
                    .submitLabel(.go)
                    .onSubmit { if canSubmit { Task { await register() } } }

                if passwordMismatch {
                    Text("Les mots de passe ne correspondent pas.")
                        .font(.caption)
                        .foregroundColor(.red)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }

            BrevButton(title: "Créer mon compte", isLoading: authVM.isLoading) {
                Task { await register() }
            }
            .disabled(!canSubmit)
        }
        .padding(24)
    }

    private func register() async {
        focused = nil
        await authVM.register(
            email: email.lowercased().trimmingCharacters(in: .whitespaces),
            password: password,
            firstName: firstName.trimmingCharacters(in: .whitespaces),
            lastName: lastName.trimmingCharacters(in: .whitespaces)
        )
    }
}
