import SwiftUI

struct MainTabView: View {
    @EnvironmentObject var authVM: AuthViewModel
    @StateObject private var subjectsVM = SubjectsViewModel()
    @State private var selectedTab = 1

    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView()
                .environmentObject(subjectsVM)
                .tabItem {
                    Label("Mes sujets", systemImage: "clock.fill")
                }
                .tag(0)

            CreateView()
                .environmentObject(subjectsVM)
                .tabItem {
                    Label("Créer", systemImage: "wand.and.stars")
                }
                .tag(1)

            AccountView()
                .environmentObject(authVM)
                .tabItem {
                    Label("Mon compte", systemImage: "person.circle.fill")
                }
                .tag(2)
        }
        .tint(.brevBlue)
        .task { await subjectsVM.load() }
    }
}
