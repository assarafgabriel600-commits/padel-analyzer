import SwiftUI

struct AuthContainerView: View {
    @EnvironmentObject var authVM: AuthViewModel
    @State private var showLogin = true

    var body: some View {
        ZStack {
            BrevBackground()

            VStack(spacing: 0) {
                // Logo + tagline
                VStack(spacing: 12) {
                    Image(systemName: "book.pages.fill")
                        .font(.system(size: 60))
                        .foregroundColor(.brevBlue)
                        .shadow(color: .brevBlue.opacity(0.3), radius: 10)

                    Text("BrevApp")
                        .font(.system(size: 34, weight: .bold, design: .rounded))
                        .foregroundColor(.brevDark)

                    Text("Ton Brevet, sur-mesure")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(.top, 60)
                .padding(.bottom, 40)

                // Auth card
                VStack(spacing: 0) {
                    // Tab switcher
                    Picker("", selection: $showLogin) {
                        Text("Connexion").tag(true)
                        Text("Inscription").tag(false)
                    }
                    .pickerStyle(.segmented)
                    .padding(.horizontal, 24)
                    .padding(.top, 20)

                    if showLogin {
                        LoginView()
                            .environmentObject(authVM)
                            .transition(.asymmetric(
                                insertion: .move(edge: .leading),
                                removal: .move(edge: .trailing)
                            ))
                    } else {
                        RegisterView()
                            .environmentObject(authVM)
                            .transition(.asymmetric(
                                insertion: .move(edge: .trailing),
                                removal: .move(edge: .leading)
                            ))
                    }
                }
                .background(Color(.systemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 24))
                .shadow(color: .black.opacity(0.1), radius: 20, y: 5)
                .padding(.horizontal, 20)

                Spacer()
            }
        }
        .animation(.spring(response: 0.35, dampingFraction: 0.85), value: showLogin)
    }
}
