import SwiftUI

@main
struct BrevAppApp: App {
    @StateObject private var authVM = AuthViewModel()

    var body: some Scene {
        WindowGroup {
            Group {
                if authVM.isLoading {
                    SplashView()
                } else if authVM.isAuthenticated {
                    MainTabView()
                        .environmentObject(authVM)
                } else {
                    AuthContainerView()
                        .environmentObject(authVM)
                }
            }
            .animation(.easeInOut(duration: 0.3), value: authVM.isAuthenticated)
        }
    }
}
