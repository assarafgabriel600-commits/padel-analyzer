import SwiftUI

@MainActor
final class SubjectsViewModel: ObservableObject {
    @Published var subjects: [GeneratedSubject] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    func load() async {
        isLoading = true
        errorMessage = nil
        do {
            subjects = try await APIService.shared.request("/subjects")
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func delete(subject: GeneratedSubject) async {
        do {
            try await APIService.shared.delete("/subjects/\(subject.id)")
            subjects.removeAll { $0.id == subject.id }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
