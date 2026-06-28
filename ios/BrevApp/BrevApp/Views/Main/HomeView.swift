import SwiftUI

struct HomeView: View {
    @EnvironmentObject var subjectsVM: SubjectsViewModel
    @State private var subjectToDelete: GeneratedSubject?
    @State private var showDeleteConfirm = false

    var body: some View {
        NavigationStack {
            ZStack {
                BrevBackground()

                if subjectsVM.isLoading && subjectsVM.subjects.isEmpty {
                    ProgressView("Chargement...")
                        .tint(.brevBlue)
                } else if subjectsVM.subjects.isEmpty {
                    EmptyStateView(
                        icon: "doc.text.magnifyingglass",
                        title: "Aucun sujet encore",
                        subtitle: "Va dans \"Créer\" et demande ton premier sujet personnalisé !"
                    )
                } else {
                    ScrollView {
                        LazyVStack(spacing: 14) {
                            ForEach(subjectsVM.subjects) { subject in
                                NavigationLink {
                                    PDFViewerView(subject: subject)
                                } label: {
                                    SubjectCardView(subject: subject)
                                }
                                .contextMenu {
                                    Button(role: .destructive) {
                                        subjectToDelete = subject
                                        showDeleteConfirm = true
                                    } label: {
                                        Label("Supprimer", systemImage: "trash")
                                    }
                                }
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.top, 8)
                        .padding(.bottom, 24)
                    }
                    .refreshable { await subjectsVM.load() }
                }
            }
            .navigationTitle("Mes sujets récents")
            .navigationBarTitleDisplayMode(.large)
            .alert("Supprimer ce sujet ?", isPresented: $showDeleteConfirm, presenting: subjectToDelete) { subject in
                Button("Supprimer", role: .destructive) {
                    Task { await subjectsVM.delete(subject: subject) }
                }
                Button("Annuler", role: .cancel) {}
            } message: { subject in
                Text("\"\(subject.title)\" sera supprimé définitivement.")
            }
        }
    }
}
