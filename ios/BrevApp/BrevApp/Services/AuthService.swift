import Foundation
import Security

final class AuthService {
    static let shared = AuthService()
    private let tokenKey = "brev_access_token"
    private let userKey = "brev_user"

    private init() {}

    var accessToken: String? {
        get { Keychain.load(key: tokenKey) }
        set {
            if let v = newValue { Keychain.save(key: tokenKey, value: v) }
            else { Keychain.delete(key: tokenKey) }
        }
    }

    var savedUser: BrevUser? {
        get {
            guard let data = UserDefaults.standard.data(forKey: userKey) else { return nil }
            return try? JSONDecoder().decode(BrevUser.self, from: data)
        }
        set {
            if let v = newValue, let data = try? JSONEncoder().encode(v) {
                UserDefaults.standard.set(data, forKey: userKey)
            } else {
                UserDefaults.standard.removeObject(forKey: userKey)
            }
        }
    }

    func register(email: String, password: String, firstName: String, lastName: String) async throws -> AuthResponse {
        let body = ["email": email, "password": password, "first_name": firstName, "last_name": lastName]
        let resp: AuthResponse = try await APIService.shared.request("/auth/register", method: "POST", body: body)
        persist(resp)
        return resp
    }

    func login(email: String, password: String) async throws -> AuthResponse {
        let body = ["email": email, "password": password]
        let resp: AuthResponse = try await APIService.shared.request("/auth/login", method: "POST", body: body)
        persist(resp)
        return resp
    }

    func logout() async {
        try? await APIService.shared.request("/auth/logout", method: "POST") as EmptyResponse
        accessToken = nil
        savedUser = nil
    }

    private func persist(_ resp: AuthResponse) {
        accessToken = resp.accessToken
        savedUser = BrevUser(
            id: resp.userId,
            email: resp.email,
            firstName: resp.firstName,
            lastName: resp.lastName
        )
    }
}

struct EmptyResponse: Decodable {}

// MARK: - Keychain helpers

private enum Keychain {
    static func save(key: String, value: String) {
        let data = Data(value.utf8)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
        ]
        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
    }

    static func load(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var result: AnyObject?
        SecItemCopyMatching(query as CFDictionary, &result)
        guard let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    static func delete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(query as CFDictionary)
    }
}
