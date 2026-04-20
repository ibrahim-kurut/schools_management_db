const {
    createNote,
    getClassNotes,
    updateNote,
    deleteNote
} = require('../src/services/noteService');
const prisma = require('../src/utils/prisma');

jest.mock('../src/utils/prisma', () => ({
    subject: {
        findFirst: jest.fn(),
    },
    note: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    }
}));

describe('Note Service Tests', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createNote', () => {
        it('should create a note if teacher teaches in the class', async () => {
            const data = { classId: 1, content: 'Great job!' };
            const teacherId = 1;

            prisma.subject.findFirst.mockResolvedValue({ id: 1, teacherId, classId: 1 });
            prisma.note.create.mockResolvedValue({ id: 1, ...data, teacherId });

            const result = await createNote(teacherId, data);

            expect(result.content).toBe('Great job!');
            expect(prisma.note.create).toHaveBeenCalled();
        });

        it('should throw an error if teacher does not teach in the class', async () => {
            const data = { classId: 1, content: 'Great job!' };
            const teacherId = 1;

            prisma.subject.findFirst.mockResolvedValue(null);

            await expect(createNote(teacherId, data)).rejects.toThrow('لا يمكنك إضافة ملاحظة لصف لا تدرسه');
        });
    });

    describe('getClassNotes', () => {
        it('should return notes for a specific class', async () => {
            const classId = 1;
            prisma.note.findMany.mockResolvedValue([{ id: 1, content: 'Note 1', classId }]);

            const result = await getClassNotes(classId);

            expect(result.length).toBe(1);
            expect(result[0].content).toBe('Note 1');
            expect(prisma.note.findMany).toHaveBeenCalled();
        });
    });

    describe('updateNote', () => {
        it('should update note if teacher owns it', async () => {
            const noteId = 1;
            const teacherId = 1;
            const content = 'Updated content';

            prisma.note.findUnique.mockResolvedValue({ id: noteId, teacherId });
            prisma.note.update.mockResolvedValue({ id: noteId, teacherId, content });

            const result = await updateNote(noteId, teacherId, content);

            expect(result.content).toBe('Updated content');
            expect(prisma.note.update).toHaveBeenCalled();
        });

        it('should throw error if note does not exist', async () => {
            prisma.note.findUnique.mockResolvedValue(null);

            await expect(updateNote(1, 1, 'content')).rejects.toThrow('الملاحظة غير موجودة');
        });

        it('should throw error if teacher does not own the note', async () => {
            prisma.note.findUnique.mockResolvedValue({ id: 1, teacherId: 2 }); // Owned by teacher 2

            await expect(updateNote(1, 1, 'content')).rejects.toThrow('لا تملك الصلاحية لتعديل هذه الملاحظة');
        });
    });

    describe('deleteNote', () => {
        it('should delete note if teacher owns it', async () => {
            const noteId = 1;
            const teacherId = 1;

            prisma.note.findUnique.mockResolvedValue({ id: noteId, teacherId });
            prisma.note.delete.mockResolvedValue({ id: noteId });

            await deleteNote(noteId, teacherId);

            expect(prisma.note.delete).toHaveBeenCalledWith({ where: { id: noteId } });
        });

        it('should throw error if note does not exist', async () => {
            prisma.note.findUnique.mockResolvedValue(null);

            await expect(deleteNote(1, 1)).rejects.toThrow('الملاحظة غير موجودة');
        });

        it('should throw error if teacher does not own the note', async () => {
            prisma.note.findUnique.mockResolvedValue({ id: 1, teacherId: 2 });

            await expect(deleteNote(1, 1)).rejects.toThrow('لا تملك الصلاحية لحذف هذه الملاحظة');
        });
    });
});
