const supabase = require('../config/supabaseClient');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const BUCKET = process.env.SUPABASE_BUCKET || 'assets';

/**
 * @description Upload a profile image to Supabase Storage and update the User record.
 * @route       POST /api/profile/upload-image
 * @access      Protected (verifyToken)
 */
const uploadImage = async (req, res) => {
    try {
        // 1. Check if a file was provided by multer
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded. Please attach an image under the field name "image".',
            });
        }

        const userId = req.user.id;
        const { buffer, mimetype, originalname } = req.file;

        // 2. Generate a unique file name to avoid collisions
        const extension = originalname.split('.').pop();
        const uniqueFileName = `users/${userId}/${Date.now()}.${extension}`;

        // 3. Upload the file buffer to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(uniqueFileName, buffer, {
                contentType: mimetype,
                upsert: true, // overwrite if same path exists
            });

        if (uploadError) {
            console.error('Supabase upload error:', uploadError);
            return res.status(500).json({
                success: false,
                message: 'Failed to upload image to storage.',
                error: uploadError.message,
            });
        }

        // 4. Get the public URL of the uploaded image
        const { data: publicUrlData } = supabase.storage
            .from(BUCKET)
            .getPublicUrl(uniqueFileName);

        const imageUrl = publicUrlData.publicUrl;

        // 5. Update the User's image field in the database via Prisma
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { image: imageUrl },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                image: true,
                role: true,
            },
        });

        return res.status(200).json({
            success: true,
            message: 'Profile image uploaded successfully.',
            data: {
                imageUrl,
                user: updatedUser,
            },
        });
    } catch (error) {
        console.error('uploadImage error:', error);
        return res.status(500).json({
            success: false,
            message: 'An unexpected error occurred while uploading the image.',
            error: error.message,
        });
    }
};

/**
 * @description Upload a school logo to Supabase Storage and update the School record.
 * @route       POST /api/schools/:id/upload-logo
 * @access      Protected (verifyToken) — only school owner or SUPER_ADMIN
 */
const uploadSchoolLogo = async (req, res) => {
    try {
        // 1. File is optional — if not provided, return early with a helpful message
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded. Attach a logo image under the field name "logo". (This step is optional — you may skip it.)',
            });
        }

        const schoolId = req.params.id;
        const userId   = req.user.id;
        const userRole = req.user.role;

        // 2. Verify the school exists
        const school = await prisma.school.findUnique({ where: { id: schoolId } });
        if (!school) {
            return res.status(404).json({ success: false, message: 'School not found.' });
        }

        // 3. Authorization: ONLY the school owner may upload a logo
        if (school.ownerId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only the school owner can update the school logo.',
            });
        }

        const { buffer, mimetype, originalname } = req.file;

        // 4. Generate a unique storage path: schools/{schoolId}/{timestamp}.{ext}
        const extension     = originalname.split('.').pop();
        const uniqueFileName = `schools/${schoolId}/${Date.now()}.${extension}`;

        // 5. Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(uniqueFileName, buffer, {
                contentType: mimetype,
                upsert: true, // replace old logo if it exists
            });

        if (uploadError) {
            console.error('Supabase logo upload error:', uploadError);
            return res.status(500).json({
                success: false,
                message: 'Failed to upload logo to storage.',
                error: uploadError.message,
            });
        }

        // 6. Get the public URL
        const { data: publicUrlData } = supabase.storage
            .from(BUCKET)
            .getPublicUrl(uniqueFileName);

        const logoUrl = publicUrlData.publicUrl;

        // 7. Persist the logo URL to the School record via Prisma
        const updatedSchool = await prisma.school.update({
            where: { id: schoolId },
            data:  { logo: logoUrl },
            select: {
                id:   true,
                name: true,
                slug: true,
                logo: true,
            },
        });

        return res.status(200).json({
            success: true,
            message: 'School logo uploaded successfully.',
            data: {
                logoUrl,
                school: updatedSchool,
            },
        });
    } catch (error) {
        console.error('uploadSchoolLogo error:', error);
        return res.status(500).json({
            success: false,
            message: 'An unexpected error occurred while uploading the school logo.',
            error: error.message,
        });
    }
};

module.exports = { uploadImage, uploadSchoolLogo };

