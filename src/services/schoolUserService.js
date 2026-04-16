const prisma = require("../utils/prisma");
const { hashPassword } = require("../utils/auth");
const redis = require("../config/redis");
const supabase = require("../config/supabaseClient");
const BUCKET = process.env.SUPABASE_BUCKET || 'assets';

/**
 * @description Add a new member to a school
 * @route POST /api/school-user
 * @method POST
 * @access private (school owner)
 */
exports.addMemberService = async (requesterId, memberData, file, requesterRole) => {
    // 1. Get School context based on requester role
    let school;
    if (requesterRole === 'SCHOOL_ADMIN' || requesterRole === 'SUPER_ADMIN') {
        school = await prisma.school.findUnique({
            where: { ownerId: requesterId },
            include: {
                subscription: { include: { plan: true } },
                classes: true
            }
        });
    } else {
        // For staff (Assistant), get school via their schoolId
        const requester = await prisma.user.findUnique({
            where: { id: requesterId },
            select: { schoolId: true }
        });
        if (requester?.schoolId) {
            school = await prisma.school.findUnique({
                where: { id: requester.schoolId },
                include: {
                    subscription: { include: { plan: true } },
                    classes: true
                }
            });
        }
    }

    if (!school) {
        throw new Error("مدرسة غير موجودة أو انتهت صلاحية الجلسة");
    }

    // 2. Check Subscription Status
    if (school.subscription?.status !== "ACTIVE") {
        throw new Error("School plan is not active");
    }

    const memberRole = memberData.role;

    // 2.5 Role Restriction: Assistant can only create TEACHER, ACCOUNTANT or STUDENT
    if (requesterRole === 'ASSISTANT' && !['TEACHER', 'ACCOUNTANT', 'STUDENT'].includes(memberRole)) {
        throw new Error("بصفتك معاون، يمكنك إضافة (معلمين، محاسبين، طلاب) فقط.");
    }

    let targetClassId = null;

    // 3. Validate Class - Required for STUDENT, Optional for TEACHER
    if (memberRole === "STUDENT" || memberRole === "TEACHER") {
        if (memberRole === "STUDENT" && !memberData.className) {
            throw new Error("Class name is required for students");
        }

        if (memberData.className) {
            const targetClass = school.classes.find((c) => c.name === memberData.className);
            if (!targetClass) {
                throw new Error("Class not found in this school");
            }
            targetClassId = targetClass.id;
        }
    }

    // 4. Check Plan Limits (Teachers and Assistants only, students are now debt-based)
    if (memberRole === "TEACHER" || memberRole === "ASSISTANT" || memberRole === "ACCOUNTANT") {
        const currentTeachersCount = await prisma.user.count({
            where: { schoolId: school.id, role: { in: ["TEACHER", "ASSISTANT", "ACCOUNTANT"] } }
        });
        if (currentTeachersCount >= school.subscription.plan.maxTeachers) {
            throw new Error("Plan limit reached for Teachers. Upgrade your plan.");
        }
    }

    // 5. Build Final Member Data
    let finalEmail = memberData.email;
    let finalPassword = memberData.password;

    // --- Student Special Handling ---
    if (memberRole === "STUDENT") {
        // A. Verify studentCode is unique within school
        const existingCode = await prisma.user.findFirst({
            where: { schoolId: school.id, studentCode: memberData.studentCode, isDeleted: false }
        });
        if (existingCode) {
            throw new Error(`كود الطالب (${memberData.studentCode}) مستخدم بالفعل في هذه المدرسة`);
        }

        // B. Generate Internal Email if not provided (or always move to internal if requested)
        if (!finalEmail || finalEmail.trim() === "") {
            const { generateInternalEmail } = require("../utils/emailGenerator");
            finalEmail = generateInternalEmail(memberData.studentCode, school.id);
        }

        // C. Default password to phone number if not provided
        if (!finalPassword || finalPassword.trim() === "") {
            finalPassword = memberData.phone; 
        }
    }

    // 5.5 Check if user email globally exists
    const existingUser = await prisma.user.findUnique({
        where: { email: finalEmail }
    });

    if (existingUser) {
        throw new Error("هذا البريد الإلكتروني مسجل مسبقاً في النظام");
    }

    // 6. Hash Password & Create User
    const hashedPassword = await hashPassword(finalPassword);

    const newUser = await prisma.user.create({
        data: {
            firstName: memberData.firstName,
            lastName: memberData.lastName,
            email: finalEmail,
            studentCode: memberData.studentCode || null,
            password: hashedPassword,
            phone: memberData.phone,
            gender: memberData.gender,
            birthDate: new Date(memberData.birthDate),
            role: memberRole,
            schoolId: school.id,
            // classId is set for STUDENT or TEACHER if provided
            ...((memberRole === "STUDENT" || memberRole === "TEACHER") && {
                classId: targetClassId,
                ...(memberRole === "STUDENT" && {
                    studentProfile: {
                        create: {
                            // Only SCHOOL_ADMIN or ACCOUNTANT can set discount
                            discountAmount: (requesterRole === 'SCHOOL_ADMIN' || requesterRole === 'ACCOUNTANT') 
                                ? (memberData.discountAmount ? Number(memberData.discountAmount) : 0) 
                                : 0,
                            discountNotes: (requesterRole === 'SCHOOL_ADMIN' || requesterRole === 'ACCOUNTANT')
                                ? (memberData.discountNotes || null)
                                : null,
                            customTuitionFee: (requesterRole === 'SCHOOL_ADMIN' || requesterRole === 'ACCOUNTANT')
                                ? (memberData.customTuitionFee ? Number(memberData.customTuitionFee) : null)
                                : null,
                            motherName: memberData.motherName || null,
                            guardianMaritalStatus: memberData.guardianMaritalStatus || null
                        }
                    }
                })
            })
        },
        include: {
            ...((memberRole === "STUDENT" || memberRole === "TEACHER") && {
                class: true,
                ...(memberRole === "STUDENT" && {
                    studentProfile: true
                })
            })
        }
    });

    // 7. Handle Image Upload if provided
    if (file) {
        try {
            const extension = file.originalname.split('.').pop();
            const fileName = `users/${newUser.id}/${Date.now()}.${extension}`;

            const { error: uploadError } = await supabase.storage
                .from(BUCKET)
                .upload(fileName, file.buffer, {
                    contentType: file.mimetype,
                    upsert: true
                });

            if (!uploadError) {
                const { data: publicUrlData } = supabase.storage
                    .from(BUCKET)
                    .getPublicUrl(fileName);

                const imageUrl = publicUrlData.publicUrl;

                // Update user with image URL in Database
                await prisma.user.update({
                    where: { id: newUser.id },
                    data: { image: imageUrl }
                });

                // Update local object for response
                newUser.image = imageUrl;
            } else {
                console.error("Supabase upload error:", uploadError);
            }
        } catch (uploadErr) {
            console.error("Image upload failed during member creation:", uploadErr);
        }
    }


    // 8. Invalidate Classes Cache
    await redis.del(`school:${school.id}:classes`);

    // Return user without sensitive data
    const { password, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
};

/**
 * @description  Get all members of a school
 * @route GET /api/school-user
 * @method GET
 * @access private (school owner)
 */

exports.getAllMembersService = async (requesterId, page, limit, searchWord, roleFilter, requesterRole, excludeRole) => {
    const skip = (page - 1) * limit;

    // 1. Get School Basic Info based on roles
    let school;
    if (requesterRole === 'SCHOOL_ADMIN' || requesterRole === 'SUPER_ADMIN') {
        school = await prisma.school.findUnique({
            where: { ownerId: requesterId },
            select: { id: true, name: true, slug: true, logo: true }
        });
    } else {
        // For staff, get school via their schoolId
        const requester = await prisma.user.findUnique({
            where: { id: requesterId },
            select: { schoolId: true }
        });
        if (requester?.schoolId) {
            school = await prisma.school.findUnique({
                where: { id: requester.schoolId },
                select: { id: true, name: true, slug: true, logo: true }
            });
        }
    }

    if (!school) {
        throw new Error("المدرسة غير موجودة أو انتهت صلاحية الجلسة");
    }

    // 2. Build dynamic where clause
    const whereClause = {
        schoolId: school.id,
        isDeleted: false,
    };

    // Add search filter (OR logic: search in firstName OR lastName)
    if (searchWord && searchWord.trim() !== "") {
        whereClause.OR = [
            { firstName: { contains: searchWord, mode: 'insensitive' } },
            { lastName: { contains: searchWord, mode: 'insensitive' } }
        ];
    }

    // Add role filter only if provided
    if (roleFilter) {
        whereClause.role = roleFilter;
    } else if (excludeRole) {
        whereClause.role = { not: excludeRole };
    }

    // 3. Get Total Count of Members (for Pagination)
    const totalMembers = await prisma.user.count({
        where: whereClause
    });

    // 4. Get Members for Current Page
    const members = await prisma.user.findMany({
        where: whereClause,
        skip: skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            studentCode: true,
            email: true,
            phone: true,
            gender: true,
            birthDate: true,
            role: true,
            schoolId: true,
            createdAt: true,
            studentProfile: {
                select: {
                    discountAmount: true,
                    discountNotes: true,
                    customTuitionFee: true,
                    motherName: true,
                    guardianMaritalStatus: true
                }
            },
            class: {
                select: {
                    id: true,
                    name: true
                }
            },
            subjects: {
                select: {
                    id: true,
                    name: true
                }
            }
        }
    });

    return {
        school,
        members,
        totalMembers
    };
};


/**
 * @description  Get a member by ID
 * @route GET /api/school-user/:id
 * @method GET
 * @access private (school owner)
 */

exports.getMemberByIdService = async (requesterId, memberId, requesterRole) => {
    // 1. Get School Basic Info based on roles
    let school;
    if (requesterRole === 'SCHOOL_ADMIN' || requesterRole === 'SUPER_ADMIN') {
        school = await prisma.school.findUnique({
        where: { ownerId: requesterId },
        select: { id: true }
        });
    } else {
        // For staff, get school via their schoolId
        const requester = await prisma.user.findUnique({
            where: { id: requesterId },
            select: { schoolId: true }
        });
        if (requester?.schoolId) {
            school = await prisma.school.findUnique({
                where: { id: requester.schoolId },
                select: { id: true }
            });
        }
    }

    if (!school) {
        throw new Error("المدرسة غير موجودة أو انتهت صلاحية الجلسة");
    }

    // 2. Get Member by ID
    const member = await prisma.user.findUnique({
        where: { id: memberId },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            studentCode: true,
            email: true,
            phone: true,
            gender: true,
            birthDate: true,
            role: true,
            schoolId: true,
            createdAt: true,
            class: {
                select: {
                    id: true,
                    name: true,
                    tuitionFee: true
                }
            },
            studentProfile: {
                select: {
                    discountAmount: true,
                    discountNotes: true,
                    customTuitionFee: true,
                    motherName: true,
                    guardianMaritalStatus: true
                }
            },
            subjects: {
                select: {
                    id: true,
                    name: true
                }
            },
        }
    });
    if (!member || member.isDeleted) {
        throw new Error("Member not found");
    }

    // 3. Check if Member belongs to the School
    if (member.schoolId !== school.id) {
        throw new Error("Member does not belong to this school");
    }

    return member;

};

/**
 * @description Update a member
 * @route PUT /api/school-user/:id
 * @method PUT
 * @access private (school owner)
 */

exports.updateMemberByIdService = async (ownerId, memberId, reqData, file, requesterRole) => {
    // 1. Get School context based on requester role
    let school;
    if (requesterRole === 'SCHOOL_ADMIN' || requesterRole === 'SUPER_ADMIN') {
        school = await prisma.school.findUnique({
            where: { ownerId: ownerId },
            include: {
                members: { where: { id: memberId, isDeleted: false } }
            }
        });
    } else {
        const requester = await prisma.user.findUnique({
            where: { id: ownerId },
            select: { schoolId: true }
        });
        if (requester?.schoolId) {
            school = await prisma.school.findUnique({
                where: { id: requester.schoolId },
                include: {
                    members: { where: { id: memberId, isDeleted: false } }
                }
            });
        }
    }

    if (!school) {
        throw new Error("المدرسة غير موجودة");
    }

    // 2. check if member exists in school
    const targetMember = school.members[0];
    if (!targetMember) {
        throw new Error("عضو غير موجود في هذه المدرسة");
    }

    // 3. RBAC Check: Assistant can only update TEACHER, STUDENT, or ACCOUNTANT
    if (requesterRole === 'ASSISTANT' && !['TEACHER', 'STUDENT', 'ACCOUNTANT'].includes(targetMember.role)) {
        throw new Error("المعاون يمكنه تعديل بيانات المعلمين والطلاب والمحاسبين فقط");
    }


    // 4. Specify allowed fields according to user role
    let dataToUpdate;

    if (requesterRole === "ASSISTANT") {
        // 5. Assistant: Can edit only limited fields
        const allowedFieldsForAssistant = ['firstName', 'lastName', 'phone', 'gender', 'birthDate', 'motherName', 'guardianMaritalStatus'];

        dataToUpdate = {};
        for (const field of allowedFieldsForAssistant) {
            if (reqData[field] !== undefined) {
                dataToUpdate[field] = field === 'birthDate'
                    ? new Date(reqData[field])
                    : reqData[field];
            }
        }

        // Check for fields to update
        if (Object.keys(dataToUpdate).length === 0) {
            throw new Error("No valid fields to update for your role");
        }
    } else {
        // 6. Owner: Can edit all fields
        dataToUpdate = { ...reqData };

        // Handle className if sent
        if (dataToUpdate.className) {
            // Search for the class by name in the database (better performance than fetching all classes)
            const targetClass = await prisma.class.findFirst({
                where: {
                    schoolId: school.id,
                    name: dataToUpdate.className
                }
            });

            if (!targetClass) {
                throw new Error("Class not found in this school");
            }

            // Update classId and delete className
            dataToUpdate.classId = targetClass.id;
            delete dataToUpdate.className;
        }

        // Convert birthDate
        if (dataToUpdate.birthDate) {
            dataToUpdate.birthDate = new Date(dataToUpdate.birthDate);
        }

        // Hash password
        if (dataToUpdate.password) {
            dataToUpdate.password = await hashPassword(dataToUpdate.password);
        }
        // Handle image if sent
        if (file) {
            try {
                const fileName = `users/${memberId}/${Date.now()}`;
                const { data: uploadData, error: uploadErr } = await supabase.storage
                    .from(BUCKET)
                    .upload(fileName, file.buffer, {
                        contentType: file.mimetype,
                        cacheControl: '3600',
                        upsert: true
                    });

                if (uploadErr) throw uploadErr;

                const { data: { publicUrl } } = supabase.storage
                    .from(BUCKET)
                    .getPublicUrl(fileName);

                dataToUpdate.image = publicUrl;
            } catch (uploadErr) {
                console.error("Image upload failed during member update:", uploadErr);
            }
        }

        // Handle Student Financial Details & Profile
        if (targetMember.role === "STUDENT" && (
            dataToUpdate.customTuitionFee !== undefined ||
            dataToUpdate.discountAmount !== undefined ||
            dataToUpdate.discountNotes !== undefined ||
            dataToUpdate.motherName !== undefined ||
            dataToUpdate.guardianMaritalStatus !== undefined
        )) {
            dataToUpdate.studentProfile = {
                upsert: {
                    update: {
                        customTuitionFee: dataToUpdate.customTuitionFee !== undefined ? (dataToUpdate.customTuitionFee ? Number(dataToUpdate.customTuitionFee) : null) : undefined,
                        discountAmount: dataToUpdate.discountAmount !== undefined ? Number(dataToUpdate.discountAmount) : undefined,
                        discountNotes: dataToUpdate.discountNotes !== undefined ? dataToUpdate.discountNotes : undefined,
                        motherName: dataToUpdate.motherName !== undefined ? dataToUpdate.motherName : undefined,
                        guardianMaritalStatus: dataToUpdate.guardianMaritalStatus !== undefined ? dataToUpdate.guardianMaritalStatus : undefined,
                    },
                    create: {
                        customTuitionFee: dataToUpdate.customTuitionFee ? Number(dataToUpdate.customTuitionFee) : null,
                        discountAmount: dataToUpdate.discountAmount ? Number(dataToUpdate.discountAmount) : 0,
                        discountNotes: dataToUpdate.discountNotes || null,
                        motherName: dataToUpdate.motherName || null,
                        guardianMaritalStatus: dataToUpdate.guardianMaritalStatus || null,
                    }
                }
            };
            delete dataToUpdate.customTuitionFee;
            delete dataToUpdate.discountAmount;
            delete dataToUpdate.discountNotes;
            delete dataToUpdate.motherName;
            delete dataToUpdate.guardianMaritalStatus;
        }
    }


    // 7. Execute the update
    const updatedMember = await prisma.user.update({
        where: { id: memberId },
        data: dataToUpdate,
        select: {
            id: true,
            firstName: true,
            lastName: true,
            studentCode: true,
            email: true,
            phone: true,
            gender: true,
            birthDate: true,
            role: true,
            image: true,
            schoolId: true,
            createdAt: true,
            updatedAt: true,
            studentProfile: {
                select: {
                    discountAmount: true,
                    discountNotes: true,
                    customTuitionFee: true,
                    motherName: true,
                    guardianMaritalStatus: true
                }
            },
            class: {
                select: {
                    id: true,
                    name: true
                }
            },
            subjects: {
                select: {
                    id: true,
                    name: true
                }
            }
        }
    });

    // 8. Invalidate Classes Cache
    await redis.del(`school:${school.id}:classes`);

    return updatedMember;
}


/**
 * @description Delete a member
 * @route DELETE /api/school-user/:id
 * @method DELETE
 * @access private (school owner)
 */

exports.deleteMemberByIdService = async (ownerId, memberId) => {
    // 1. Get School for the Requester (Owner)
    const school = await prisma.school.findUnique({
        where: { ownerId: ownerId },
        include: {
            members: { where: { id: memberId, isDeleted: false } }
        }
    });

    if (!school) {
        throw new Error("School not found for this user");
    }

    // 2. Check if member exists in school
    const targetMember = school.members[0];
    if (!targetMember) {
        throw new Error("Member not found in this school");
    }

    // 3. Delete the member (Soft Delete)
    const deletedMember = await prisma.user.update({
        where: { id: memberId },
        data: { isDeleted: true },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            studentCode: true,
            email: true,
            phone: true,
            gender: true,
            birthDate: true,
            role: true,
            schoolId: true,
            createdAt: true,
            updatedAt: true,
            isDeleted: true
        }
    });

    // 4. Invalidate Classes Cache
    await redis.del(`school:${school.id}:classes`);

    return deletedMember;
}




// --- Helper Services ---

/**
 * @description Check if a student code is available in a specific school
 */
exports.checkStudentCodeService = async (requesterId, code, requesterRole) => {
    // 1. Get School context
    let school;
    if (requesterRole === 'SCHOOL_ADMIN' || requesterRole === 'SUPER_ADMIN') {
        school = await prisma.school.findUnique({ where: { ownerId: requesterId } });
    } else {
        const requester = await prisma.user.findUnique({ where: { id: requesterId }, select: { schoolId: true } });
        if (requester?.schoolId) school = await prisma.school.findUnique({ where: { id: requester.schoolId } });
    }

    if (!school) throw new Error("المدرسة غير موجودة");

    // 2. Search for active student with this code in this school
    const existing = await prisma.user.findFirst({
        where: {
            schoolId: school.id,
            studentCode: code,
            isDeleted: false
        }
    });

    return { available: !existing };
};


// =============================================
// خدمة الرفع الجماعي للطلاب (Bulk Import)
// =============================================

/**
 * @description جلب سياق المدرسة بناءً على دور المستخدم
 * @param {string} requesterId - معرف المستخدم الطالب
 * @param {string} requesterRole - دور المستخدم
 * @returns {Object} المدرسة مع الاشتراك والخطة
 */
const getSchoolContext = async (requesterId, requesterRole) => {
    let school;
    if (requesterRole === 'SCHOOL_ADMIN' || requesterRole === 'SUPER_ADMIN') {
        school = await prisma.school.findUnique({
            where: { ownerId: requesterId },
            include: {
                subscription: { include: { plan: true } },
            }
        });
    } else {
        const requester = await prisma.user.findUnique({
            where: { id: requesterId },
            select: { schoolId: true }
        });
        if (requester?.schoolId) {
            school = await prisma.school.findUnique({
                where: { id: requester.schoolId },
                include: {
                    subscription: { include: { plan: true } },
                }
            });
        }
    }
    return school;
};

/**
 * @description خدمة الرفع الجماعي للطلاب من ملف إكسل
 * @param {string} requesterId - معرف المستخدم المُنفّذ
 * @param {string} requesterRole - دور المستخدم المُنفّذ
 * @param {string} classId - معرف الصف الدراسي المختار
 * @param {Array<Object>} students - مصفوفة الطلاب بعد التطهير من excelHelper
 * @returns {Object} عدد الطلاب المضافين وتفاصيل إضافية
 */
exports.bulkImportStudentsService = async (requesterId, requesterRole, classId, students) => {
    // 1. جلب سياق المدرسة
    const school = await getSchoolContext(requesterId, requesterRole);

    if (!school) {
        throw new Error("المدرسة غير موجودة أو انتهت صلاحية الجلسة");
    }

    // 2. التحقق من حالة الاشتراك
    if (school.subscription?.status !== "ACTIVE") {
        throw new Error("اشتراك المدرسة غير فعّال. يرجى تجديد الاشتراك أولاً.");
    }

    // 3. التحقق من أن الصف ينتمي لهذه المدرسة
    const targetClass = await prisma.class.findFirst({
        where: { id: classId, schoolId: school.id, isDeleted: false }
    });

    if (!targetClass) {
        throw new Error("الصف الدراسي المحدد غير موجود في هذه المدرسة.");
    }

    // 4. تمت إزالة المنع بخصوص حدود الخطة بالنسبة للطلاب، سيتم احتساب الديون لاحقاً بدلاً من الرفض.

    // 5. جلب آخر studentCode في المدرسة لتوليد الأكواد التلقائية
    const lastStudent = await prisma.user.findFirst({
        where: { schoolId: school.id, role: "STUDENT", studentCode: { not: null } },
        orderBy: { studentCode: 'desc' },
        select: { studentCode: true }
    });

    let nextCodeNumber = 1; // البداية الافتراضية
    if (lastStudent && lastStudent.studentCode) {
        const parsed = parseInt(lastStudent.studentCode, 10);
        if (!isNaN(parsed)) {
            nextCodeNumber = parsed + 1;
        }
    }

    // 6. التحقق من الأكواد المتكررة أو الموجودة مسبقاً
    const providedCodes = students
        .filter(s => s.studentCode)
        .map(s => s.studentCode);

    if (providedCodes.length > 0) {
        // التحقق من التكرار داخل الملف نفسه
        const uniqueCodes = new Set(providedCodes);
        if (uniqueCodes.size !== providedCodes.length) {
            throw new Error("يوجد تكرار في أكواد الطلاب داخل الملف. يرجى التأكد من عدم تكرار أي كود.");
        }

        // التحقق من وجود الأكواد مسبقاً في قاعدة البيانات
        const existingCodes = await prisma.user.findMany({
            where: {
                schoolId: school.id,
                studentCode: { in: providedCodes },
                isDeleted: false
            },
            select: { studentCode: true }
        });

        if (existingCodes.length > 0) {
            const codes = existingCodes.map(u => u.studentCode).join(', ');
            throw new Error(`الأكواد التالية مستخدمة مسبقاً في المدرسة: ${codes}`);
        }
    }

    // 7. تجهيز بيانات كل طالب
    const { generateInternalEmail } = require("../utils/emailGenerator");
    const usersData = [];
    const profilesData = [];

    for (const student of students) {
        // تحديد كود الطالب (من الإكسل أو توليد تلقائي)
        let code;
        if (student.studentCode) {
            code = student.studentCode;
        } else {
            code = String(nextCodeNumber);
            nextCodeNumber++;
        }

        // توليد الإيميل الداخلي
        const email = generateInternalEmail(code, school.id);

        // تشفير رقم هاتف ولي الأمر ليكون كلمة المرور
        const hashedPassword = await hashPassword(student.parentPhone);

        // استخدام البيانات كما جاءت من الإكسل (بعد التطهير في excelHelper)
        usersData.push({
            firstName: student.firstName,
            lastName: student.lastName,
            studentCode: code,
            email,
            phone: student.parentPhone,
            password: hashedPassword,
            gender: student.gender,
            birthDate: new Date(student.birthDate),
            role: 'STUDENT',
            schoolId: school.id,
            classId: targetClass.id,
        });

        // حفظ بيانات الملف الشخصي لإنشائها لاحقاً
        profilesData.push({
            studentCode: code,
            motherName: student.motherName || null,
            guardianMaritalStatus: student.guardianMaritalStatus || null,
        });
    }

    // 8. الإدخال الجماعي في قاعدة البيانات (عملية واحدة لضمان السرعة)
    const result = await prisma.user.createMany({
        data: usersData,
        skipDuplicates: true, // تخطي أي تكرار محتمل في الإيميل
    });

    // 9. إنشاء StudentProfile لكل طالب جديد (مع بيانات اسم الأم والحالة الاجتماعية)
    const newStudents = await prisma.user.findMany({
        where: {
            schoolId: school.id,
            studentCode: { in: usersData.map(u => u.studentCode) },
            role: 'STUDENT',
        },
        select: { id: true, studentCode: true }
    });

    if (newStudents.length > 0) {
        await prisma.studentProfile.createMany({
            data: newStudents.map(s => {
                const profileInfo = profilesData.find(p => p.studentCode === s.studentCode);
                return {
                    userId: s.id,
                    motherName: profileInfo?.motherName || null,
                    guardianMaritalStatus: profileInfo?.guardianMaritalStatus || null,
                };
            }),
            skipDuplicates: true,
        });
    }

    // 10. Invalidate Classes Cache
    await redis.del(`school:${school.id}:classes`);

    return {
        importedCount: result.count,
        className: targetClass.name,
    };
};
