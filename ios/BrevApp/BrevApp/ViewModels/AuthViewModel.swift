import SwiftUI

@MainActor
final class AuthViewModel: ObservableObject {
    @Published var user: BrevUser?
    @Published var isLoading = true
    @Published var errorMessage: String?

    var isAuthenticated: Bool { user != nil }

    init() {
        // Restore session from Keychain/UserDefaults
        if AuthService.shared.accessToken != nil, let saved = AuthService.shared.savedUser {
            self.user = saved
        }
        isLoading = false
    }

    func register(email: String, password: String, firstName: String, lastName: String) async {
        isLoading = true
        errorMessage = nil
        do {
            let resp = try await AuthService.shared.register(
                email: email, password: password,
                firstName: firstName, lastName: lastName
            )
            user = BrevUser(id: resp.userId, email: resp.email, firstName: resp.firstName, lastName: resp.lastName)
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func login(email: String, password: String) async {
        isLoading = true
        errorMessage = nil
        do {
            let resp = try await AuthService.shared.login(email: email, password: password)
            user = BrevUser(id: resp.userId, email: resp.email, firstName: resp.firstName, lastName: resp.lastName)
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func logout() async {
        await AuthService.shared.logout()
        user = nil
    }
}
