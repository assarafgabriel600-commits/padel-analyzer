import SwiftUI

struct AccountView: View {
    @EnvironmentObject var authVM: AuthViewModel
    @State private var showLogoutConfirm = false

    var body: some View {
        NavigationStack {
            ZStack {
                BrevBackground()

                ScrollView {
                    VStack(spacing: 24) {
                        // Avatar
                        VStack(spacing: 12) {
                            ZStack {
                                Circle()
                                    .fill(LinearGradient(
                                        colors: [.brevBlue, .brevIndigo],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    ))
                                    .frame(width: 90, height: 90)
                                    .shadow(color: .brevBlue.opacity(0.4), radius: 12)

                                Text(authVM.user?.initials ?? "?")
                                    .font(.system(size: 32, weight: .bold, design: .rounded))
                                    .foregroundColor(.white)
                            }

                            Text(authVM.user?.fullName ?? "")
                                .font(.title3.bold())

                            Text(authVM.user?.email ?? "")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        .padding(.top, 20)

                        // Info cards
                        VStack(spacing: 0) {
                            AccountRow(icon: "envelope", label: "Email", value: authVM.user?.email ?? "")
                            Divider().padding(.leading, 48)
                            AccountRow(icon: "person", label: "Prénom", value: authVM.user?.firstName ?? "")
                            Divider().padding(.leading, 48)
                            AccountRow(icon: "person", label: "Nom", value: authVM.user?.lastName ?? "")
                        }
                        .background(Color(.systemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                        .padding(.horizontal, 16)

                        // App info
                        VStack(spacing: 0) {
                            AccountRow(icon: "info.circle", label: "Version", value: "1.0.0")
                            Divider().padding(.leading, 48)
                            AccountRow(icon: "doc.text", label: "Annales couvertes", value: "2017 → 2025")
                        }
                        .background(Color(.systemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                        .padding(.horizontal, 16)

                        // Logout
                        Button(role: .destructive) {
                            showLogoutConfirm = true
                        } label: {
                            HStack {
                                Image(systemName: "rectangle.portrait.and.arrow.right")
                                Text("Se déconnecter")
                                    .fontWeight(.semibold)
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.red.opacity(0.1))
                            .foregroundColor(.red)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                        }
                        .padding(.horizontal, 16)
                        .padding(.bottom, 40)
                    }
                }
            }
            .navigationTitle("Mon compte")
            .navigationBarTitleDisplayMode(.large)
            .alert("Se déconnecter ?", isPresented: $showLogoutConfirm) {
                Button("Se déconnecter", role: .destructive) {
                    Task { await authVM.logout() }
                }
                Button("Annuler", role: .cancel) {}
            }
        }
    }
}

private struct AccountRow: View {
    let icon: String
    let label: String
    let value: String

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: icon)
                .frame(width: 24)
                .foregroundColor(.brevBlue)
            Text(label)
                .foregroundColor(.secondary)
            Spacer()
            Text(value)
                .foregroundColor(.primary)
                .lineLimit(1)
                .truncationMode(.middle)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
    }
}
